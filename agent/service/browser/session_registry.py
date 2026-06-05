import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional

from playwright.async_api import BrowserContext, CDPSession, Page

from agent.core.config import settings
from agent.utils.logger import logger


@dataclass
class BrowserSession:
    """Represents a single browser session with its associated resources."""

    session_id: str
    session_name: str
    page: Page
    context: BrowserContext
    cdp_session: CDPSession
    url: str
    created_at: float = field(default_factory=time.time)
    screencast_active: bool = False
    last_activity: float = field(default_factory=time.time)

    def touch(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = time.time()

    def to_dict(self) -> dict:
        """Serialize session info for API responses."""
        return {
            "session_id": self.session_id,
            "session_name": self.session_name,
            "url": self.url,
            "created_at": self.created_at,
            "screencast_active": self.screencast_active,
            "idle_seconds": int(time.time() - self.last_activity),
        }


class SessionRegistry:
    """Registry that maps session_id to BrowserSession instances with auto-cleanup."""

    def __init__(self) -> None:
        self._sessions: dict[str, BrowserSession] = {}
        self._cleanup_task: Optional[asyncio.Task] = None

    def add(self, session: BrowserSession) -> None:
        """Register a new browser session."""
        self._sessions[session.session_id] = session
        logger.info(f"Session registered: {session.session_id} ({session.session_name})")

    def get(self, session_id: str) -> BrowserSession:
        """Retrieve a session by ID. Raises KeyError if not found."""
        if session_id not in self._sessions:
            raise KeyError(f"Browser session not found: {session_id}")
        session = self._sessions[session_id]
        session.touch()
        return session

    def remove(self, session_id: str) -> Optional[BrowserSession]:
        """Remove and return a session from the registry."""
        session = self._sessions.pop(session_id, None)
        if session:
            logger.info(f"Session removed: {session_id}")
        return session

    def list_sessions(self) -> list[dict]:
        """Return info dicts for all active sessions."""
        return [s.to_dict() for s in self._sessions.values()]

    @property
    def count(self) -> int:
        """Number of active sessions."""
        return len(self._sessions)

    def start_cleanup_loop(self) -> None:
        """Start the background cleanup task for idle sessions."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    def stop_cleanup_loop(self) -> None:
        """Stop the background cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()

    async def _cleanup_loop(self) -> None:
        """Periodically close sessions that exceed the idle timeout."""
        timeout = settings.BROWSER_SESSION_TIMEOUT
        while True:
            await asyncio.sleep(60)
            now = time.time()
            expired_ids = [
                sid
                for sid, session in self._sessions.items()
                if (now - session.last_activity) > timeout
            ]
            for sid in expired_ids:
                session = self._sessions.pop(sid, None)
                if session:
                    logger.info(f"Closing idle session: {sid} (idle {int(now - session.last_activity)}s)")
                    try:
                        await session.context.close()
                    except Exception as e:
                        logger.error(f"Error closing idle session {sid}: {e}")
