import asyncio
import time
from typing import Callable, Coroutine, Any

from playwright.async_api import CDPSession, Page

from agent.utils.logger import logger


class CDPEventListener:
    """Listens to CDP and Playwright page events and emits typed ActionEvent messages."""

    def __init__(
        self,
        session_id: str,
        page: Page,
        cdp_session: CDPSession,
        on_action: Callable[[dict], Coroutine[Any, Any, None]],
    ) -> None:
        self._session_id = session_id
        self._page = page
        self._cdp_session = cdp_session
        self._on_action = on_action
        self._active = False
        self._loop: asyncio.AbstractEventLoop | None = None

    async def start(self) -> None:
        """Subscribe to page and CDP events."""
        if self._active:
            return

        self._loop = asyncio.get_running_loop()

        self._page.on("framenavigated", self._on_frame_navigated)
        self._page.on("load", self._on_page_load)
        self._page.on("console", self._on_console)

        self._active = True
        logger.info(f"CDP event listener started for session: {self._session_id}")

    async def stop(self) -> None:
        """Unsubscribe from events."""
        if not self._active:
            return

        try:
            self._page.remove_listener("framenavigated", self._on_frame_navigated)
            self._page.remove_listener("load", self._on_page_load)
            self._page.remove_listener("console", self._on_console)
        except Exception as e:
            logger.error(f"Error removing event listeners for {self._session_id}: {e}")
        finally:
            self._active = False
            logger.info(f"CDP event listener stopped for session: {self._session_id}")

    def _schedule(self, coro) -> None:
        """Schedule a coroutine on the event loop from a sync callback."""
        if self._loop and self._active:
            self._loop.create_task(coro)

    async def _emit_action(self, action: str, detail: dict) -> None:
        """Build and push an action event message."""
        message = {
            "type": "action",
            "session_id": self._session_id,
            "action": action,
            "detail": detail,
            "timestamp": time.time(),
        }
        try:
            await self._on_action(message)
        except Exception as e:
            logger.error(f"Error emitting action event: {e}")

    def _on_frame_navigated(self, frame) -> None:
        """Handle page frame navigation."""
        if frame == self._page.main_frame:
            self._schedule(self._emit_action("navigate", {"url": frame.url}))

    def _on_page_load(self, page) -> None:
        """Handle page load complete."""
        self._schedule(self._emit_action("page_load", {"url": self._page.url}))

    def _on_console(self, msg) -> None:
        """Handle console messages (only warnings and errors)."""
        if msg.type in ("warning", "error"):
            self._schedule(
                self._emit_action(
                    "console",
                    {"level": msg.type, "text": msg.text},
                )
            )
