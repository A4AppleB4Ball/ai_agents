import asyncio
import uuid
from typing import Optional

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from agent.core.config import settings
from agent.service.browser.cdp_event_listener import CDPEventListener
from agent.service.browser.screencast_stream import ScreencastStream
from agent.service.browser.session_registry import BrowserSession, SessionRegistry
from agent.utils.logger import logger


class BrowserManager:
    """Manages browser sessions for CDP screencast streaming.

    Two modes of operation:
    1. Direct mode: launches its own headless Chromium (for backend-initiated sessions)
    2. Attach mode: connects to an existing browser's CDP port (for agent-launched browsers)

    The agent uses playwright-cli to control the browser. This manager independently
    connects to the same CDP endpoint to stream screencast frames to the frontend.
    """

    _instance: Optional["BrowserManager"] = None

    def __new__(cls) -> "BrowserManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._registry = SessionRegistry()
        self._screencasts: dict[str, ScreencastStream] = {}
        self._listeners: dict[str, CDPEventListener] = {}
        self._event_callback = None
        self._lock = asyncio.Lock()

    @property
    def registry(self) -> SessionRegistry:
        return self._registry

    def set_event_callback(self, callback) -> None:
        """Set the callback function for pushing frame/action events to WebSocket clients."""
        self._event_callback = callback

    async def start(self) -> None:
        """Launch a headless Chromium browser for direct mode."""
        async with self._lock:
            if self._browser is not None:
                return

            self._playwright = await async_playwright().start()

            chromium_args = [
                arg.strip()
                for arg in settings.BROWSER_CHROMIUM_ARGS.split(",")
                if arg.strip()
            ]

            launch_kwargs = {
                "headless": settings.BROWSER_HEADLESS,
                "args": chromium_args,
            }
            if settings.BROWSER_CHANNEL:
                launch_kwargs["channel"] = settings.BROWSER_CHANNEL

            self._browser = await self._playwright.chromium.launch(**launch_kwargs)
            self._registry.start_cleanup_loop()
            logger.info("Browser launched successfully")

    async def stop(self) -> None:
        """Close the browser and cleanup all resources."""
        async with self._lock:
            self._registry.stop_cleanup_loop()

            for session_id in list(self._screencasts.keys()):
                await self._screencasts[session_id].stop()
            for session_id in list(self._listeners.keys()):
                await self._listeners[session_id].stop()

            self._screencasts.clear()
            self._listeners.clear()

            if self._browser:
                await self._browser.close()
                self._browser = None

            if self._playwright:
                await self._playwright.stop()
                self._playwright = None

            logger.info("Browser stopped and all sessions cleaned up")

    async def create_session(
        self,
        session_name: str,
        url: str,
        cookies: list[dict] | None = None,
        storage_state: dict | None = None,
        auth_token: str | None = None,
    ) -> BrowserSession:
        """Create a new browser session with its own context and page.

        Launches browser lazily if not already running.
        Starts screencast and CDP event listeners for live streaming.

        Args:
            session_name: Human-readable session name.
            url: URL to navigate to.
            cookies: Optional list of cookies to inject (for SSO auth).
            storage_state: Optional Playwright storage state (cookies + localStorage).
            auth_token: Optional Bearer token to set as Authorization header.
        """
        if self._registry.count >= settings.BROWSER_MAX_SESSIONS:
            raise RuntimeError(
                f"Maximum concurrent sessions ({settings.BROWSER_MAX_SESSIONS}) reached"
            )

        if self._browser is None:
            await self.start()

        session_id = str(uuid.uuid4())

        context_options = {
            "viewport": {"width": 1280, "height": 720},
            "ignore_https_errors": True,
        }

        if storage_state:
            context_options["storage_state"] = storage_state

        if auth_token:
            context_options["extra_http_headers"] = {
                "Authorization": f"Bearer {auth_token}",
            }

        context = await self._browser.new_context(**context_options)

        if cookies:
            await context.add_cookies(cookies)

        page = await context.new_page()

        cdp_session = await context.new_cdp_session(page)

        session = BrowserSession(
            session_id=session_id,
            session_name=session_name,
            page=page,
            context=context,
            cdp_session=cdp_session,
            url=url,
        )

        self._registry.add(session)

        screencast = ScreencastStream(
            session_id=session_id,
            cdp_session=cdp_session,
            on_frame=self._push_event,
        )
        await screencast.start()
        self._screencasts[session_id] = screencast
        session.screencast_active = True

        listener = CDPEventListener(
            session_id=session_id,
            page=page,
            cdp_session=cdp_session,
            on_action=self._push_event,
        )
        await listener.start()
        self._listeners[session_id] = listener

        await page.goto(url, wait_until="domcontentloaded")

        logger.info(f"Browser session created: {session_id} -> {url}")
        return session

    async def attach_to_cdp(self, session_name: str, cdp_url: str = "http://localhost:9222") -> BrowserSession:
        """Attach to an externally-launched browser via CDP for screencast streaming.

        This is used when the agent launches a browser via playwright-cli and the backend
        needs to connect to it independently for live visualization.
        """
        if self._playwright is None:
            self._playwright = await async_playwright().start()

        session_id = str(uuid.uuid4())

        browser = await self._playwright.chromium.connect_over_cdp(cdp_url)
        contexts = browser.contexts
        if not contexts:
            raise RuntimeError(f"No browser contexts found at {cdp_url}")

        context = contexts[0]
        pages = context.pages
        if not pages:
            raise RuntimeError(f"No pages found in browser at {cdp_url}")

        page = pages[0]
        cdp_session = await context.new_cdp_session(page)

        session = BrowserSession(
            session_id=session_id,
            session_name=session_name,
            page=page,
            context=context,
            cdp_session=cdp_session,
            url=page.url,
        )

        self._registry.add(session)

        screencast = ScreencastStream(
            session_id=session_id,
            cdp_session=cdp_session,
            on_frame=self._push_event,
        )
        await screencast.start()
        self._screencasts[session_id] = screencast
        session.screencast_active = True

        listener = CDPEventListener(
            session_id=session_id,
            page=page,
            cdp_session=cdp_session,
            on_action=self._push_event,
        )
        await listener.start()
        self._listeners[session_id] = listener

        logger.info(f"Attached to CDP browser: {session_id} ({cdp_url}) -> {page.url}")
        return session

    async def close_session(self, session_id: str) -> None:
        """Stop screencast and listeners for a session."""
        screencast = self._screencasts.pop(session_id, None)
        if screencast:
            await screencast.stop()

        listener = self._listeners.pop(session_id, None)
        if listener:
            await listener.stop()

        session = self._registry.remove(session_id)
        if session:
            try:
                await session.context.close()
            except Exception as e:
                logger.error(f"Error closing browser context for {session_id}: {e}")

        logger.info(f"Browser session closed: {session_id}")

    async def list_sessions(self) -> list[dict]:
        """Return info for all active sessions."""
        return self._registry.list_sessions()

    async def _push_event(self, message: dict) -> None:
        """Push event to the registered callback (WebSocket broadcast)."""
        if self._event_callback:
            await self._event_callback(message)
