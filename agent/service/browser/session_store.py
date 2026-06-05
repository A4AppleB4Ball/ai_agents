"""Browser session-to-chat metadata store.

Manages per-chat session metadata files so the agent knows which browser
sessions belong to which chat conversation.
"""

import hashlib
import json
import time
from pathlib import Path
from typing import Any

from agent.core.config import get_workspace_base_path
from agent.utils.logger import logger


class BrowserSessionStore:
    """Manages per-chat session metadata files.

    Stores active browser sessions per chat in:
    {workspace}/{user_id}/UI-Agent/.sessions/{session_key_hash}.json
    """

    def _get_sessions_dir(self, user_id: str) -> Path:
        """Get the sessions metadata directory for a user."""
        base = Path(get_workspace_base_path())
        sessions_dir = base / user_id / "UI-Agent" / ".sessions"
        sessions_dir.mkdir(parents=True, exist_ok=True)
        return sessions_dir

    def _get_session_file(self, user_id: str, chat_session_key: str) -> Path:
        """Get the metadata file path for a specific chat session."""
        sessions_dir = self._get_sessions_dir(user_id)
        key_hash = hashlib.sha256(chat_session_key.encode()).hexdigest()[:16]
        return sessions_dir / f"{key_hash}.json"

    def _read_metadata(self, file_path: Path) -> dict[str, Any]:
        """Read session metadata from file."""
        if not file_path.exists():
            return {"chat_session_key": "", "sessions": []}
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
            return data
        except (json.JSONDecodeError, OSError) as e:
            logger.error(f"Error reading session metadata from {file_path}: {e}")
            raise RuntimeError(f"Failed to read session metadata: {e}")

    def _write_metadata(self, file_path: Path, data: dict[str, Any]) -> None:
        """Write session metadata to file."""
        try:
            file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except OSError as e:
            logger.error(f"Error writing session metadata to {file_path}: {e}")
            raise RuntimeError(f"Failed to write session metadata: {e}")

    async def add_session(
        self,
        user_id: str,
        chat_session_key: str,
        tab_id: str,
        session_name: str,
        url: str,
    ) -> None:
        """Register a browser session for a chat.

        Args:
            user_id: The user who owns this session.
            chat_session_key: The chat conversation key.
            tab_id: The browser session ID.
            session_name: Human-readable session name.
            url: Initial URL of the session.
        """
        file_path = self._get_session_file(user_id, chat_session_key)
        data = self._read_metadata(file_path)
        data["chat_session_key"] = chat_session_key

        # Avoid duplicates
        existing_ids = {s["tab_id"] for s in data["sessions"]}
        if tab_id in existing_ids:
            logger.warning(f"Session {tab_id} already registered for chat {chat_session_key}")
            return

        data["sessions"].append({
            "tab_id": tab_id,
            "session_name": session_name,
            "url": url,
            "created_at": time.time(),
        })

        self._write_metadata(file_path, data)
        logger.info(f"Session {tab_id} added to chat {chat_session_key} for user {user_id}")

    async def remove_session(
        self,
        user_id: str,
        chat_session_key: str,
        tab_id: str,
    ) -> None:
        """Remove a browser session from a chat.

        Args:
            user_id: The user who owns this session.
            chat_session_key: The chat conversation key.
            tab_id: The browser session ID to remove.
        """
        file_path = self._get_session_file(user_id, chat_session_key)
        data = self._read_metadata(file_path)

        original_count = len(data["sessions"])
        data["sessions"] = [s for s in data["sessions"] if s["tab_id"] != tab_id]

        if len(data["sessions"]) == original_count:
            logger.warning(f"Session {tab_id} not found in chat {chat_session_key}")
            return

        self._write_metadata(file_path, data)
        logger.info(f"Session {tab_id} removed from chat {chat_session_key} for user {user_id}")

    async def get_sessions(self, user_id: str, chat_session_key: str) -> list[dict]:
        """Get all active browser sessions for a chat.

        Args:
            user_id: The user who owns the sessions.
            chat_session_key: The chat conversation key.

        Returns:
            List of session metadata dicts.
        """
        file_path = self._get_session_file(user_id, chat_session_key)
        data = self._read_metadata(file_path)
        return data["sessions"]

    async def clear_sessions(self, user_id: str, chat_session_key: str) -> None:
        """Remove all browser sessions for a chat.

        Args:
            user_id: The user who owns the sessions.
            chat_session_key: The chat conversation key.
        """
        file_path = self._get_session_file(user_id, chat_session_key)
        data = {
            "chat_session_key": chat_session_key,
            "sessions": [],
        }
        self._write_metadata(file_path, data)
        logger.info(f"All sessions cleared for chat {chat_session_key} for user {user_id}")
