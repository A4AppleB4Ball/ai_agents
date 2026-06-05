import asyncio
import time
from typing import Callable, Coroutine, Any

from playwright.async_api import CDPSession

from agent.core.config import settings
from agent.utils.logger import logger


class ScreencastStream:
    """Manages CDP Page.startScreencast for a single session and pushes frames to subscribers."""

    def __init__(
        self,
        session_id: str,
        cdp_session: CDPSession,
        on_frame: Callable[[dict], Coroutine[Any, Any, None]],
    ) -> None:
        self._session_id = session_id
        self._cdp_session = cdp_session
        self._on_frame = on_frame
        self._active = False
        self._loop: asyncio.AbstractEventLoop | None = None

    @property
    def active(self) -> bool:
        return self._active

    async def start(self) -> None:
        """Start the CDP screencast and register frame handler."""
        if self._active:
            return

        self._loop = asyncio.get_running_loop()

        self._cdp_session.on("Page.screencastFrame", self._on_screencast_frame)

        await self._cdp_session.send("Page.enable")
        await self._cdp_session.send(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": settings.BROWSER_SCREENCAST_QUALITY,
                "maxWidth": 1280,
                "maxHeight": 720,
            },
        )
        self._active = True
        logger.info(f"Screencast started for session: {self._session_id}")

    async def stop(self) -> None:
        """Stop the CDP screencast."""
        if not self._active:
            return

        try:
            await self._cdp_session.send("Page.stopScreencast")
        except Exception as e:
            logger.error(f"Error stopping screencast for {self._session_id}: {e}")
        finally:
            self._active = False
            logger.info(f"Screencast stopped for session: {self._session_id}")

    def _on_screencast_frame(self, params: dict) -> None:
        """Sync handler for CDP event — schedules async processing."""
        if self._loop and self._active:
            self._loop.create_task(self._handle_frame(params))

    async def _handle_frame(self, params: dict) -> None:
        """Handle incoming screencast frame from CDP."""
        session_id = params.get("sessionId", 0)
        frame_data = params.get("data", "")
        timestamp = params.get("metadata", {}).get("timestamp", time.time())

        # Acknowledge the frame so CDP continues sending
        try:
            await self._cdp_session.send(
                "Page.screencastFrameAck", {"sessionId": session_id}
            )
        except Exception as e:
            logger.error(f"Error acking screencast frame: {e}")

        # Push frame to subscribers
        message = {
            "type": "frame",
            "session_id": self._session_id,
            "data": frame_data,
            "timestamp": timestamp,
        }

        try:
            await self._on_frame(message)
        except Exception as e:
            logger.error(f"Error pushing frame for {self._session_id}: {e}")
