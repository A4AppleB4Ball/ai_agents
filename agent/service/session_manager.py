# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：session_manager.py
# @Date   ：2025/11/27 15:33
#
# 2025/11/27 15:33   Create
# 2026/2/25          Refactor: session_key routing
# =====================================================

"""
SDK session manager

[INPUT]: Depends on ClaudeSDKClient/ClaudeAgentOptions from claude_agent_sdk,
         and session storage from session_store
[OUTPUT]: Provides SessionManager (SDK client lifecycle management)
[POS]: SDK session management at service layer, consumed by ChatHandler
[PROTOCOL]: Update this header when changes are made, then check CLAUDE.md
"""

import asyncio
from pathlib import Path
from typing import Any, Dict, Optional

from claude_agent_sdk import CanUseTool, ClaudeAgentOptions, ClaudeSDKClient

from agent.service.session_store import session_store
from agent.shared.server.common.base_exception import ServerException
from agent.utils.logger import logger


class SessionManager:
    """Manage active ClaudeSDKClient sessions (indexed by session_key)"""

    def __init__(self):
        self._sessions: Dict[str, ClaudeSDKClient] = {}  # session_key → client
        self._locks: Dict[str, asyncio.Lock] = {}

        # SDK session ID mapping (session_key ↔ sdk_id)
        self._key_sdk_map: Dict[str, str] = {}  # session_key → sdk_id
        self._sdk_key_map: Dict[str, str] = {}  # sdk_id → session_key

    async def get_session(self, session_key: str) -> Optional[ClaudeSDKClient]:
        """Get existing SDK client"""
        return self._sessions.get(session_key)

    async def create_session(
            self,
            session_key: str,
            can_use_tool: Optional[CanUseTool],
            session_id: Optional[str] = None,
            session_options: Optional[Dict[str, Any]] = None,
    ) -> ClaudeSDKClient:
        """Create new session or return existing session"""
        if session_key in self._sessions:
            logger.info(f"🔄 Returning existing session: {session_key}")
            return self._sessions[session_key]

        # Build options
        if session_options:
            options = ClaudeAgentOptions(can_use_tool=can_use_tool, **session_options)
        else:
            options = ClaudeAgentOptions(can_use_tool=can_use_tool)

        # Resume
        if session_id:
            options.resume = session_id
            logger.info(f"🔄 Resuming history session: key={session_key}, sdk_session={session_id}")
        else:
            logger.info(f"✨ Creating new session: key={session_key}")

        # Validate cwd
        cwd = Path(options.cwd)
        if not cwd.is_dir():
            raise ServerException(f"Specified cwd path does not exist: {cwd}")
        options.cwd = cwd.absolute().as_posix()

        try:
            client = ClaudeSDKClient(options=options)
            self._sessions[session_key] = client
            self._locks[session_key] = asyncio.Lock()

            logger.info(f"✅ SDK client created: key={session_key}")
            return client

        except Exception as e:
            logger.error(f"❌ Failed to create session {session_key}: {e}")
            raise

    def get_lock(self, session_key: str) -> asyncio.Lock:
        """Get session lock"""
        if session_key not in self._locks:
            self._locks[session_key] = asyncio.Lock()
        return self._locks[session_key]

    async def register_sdk_session(self, session_key: str, session_id: str) -> None:
        """Register mapping between session_key and SDK session_id"""
        self._key_sdk_map[session_key] = session_id
        self._sdk_key_map[session_id] = session_key

        try:
            await session_store.update_session(session_key=session_key, session_id=session_id)
            logger.info(f"💾 Session mapping recorded: {session_key} ↔ {session_id}")
        except Exception as db_error:
            logger.warning(f"⚠️ Failed to record session mapping: {db_error}")

    def get_session_id(self, session_key: str) -> Optional[str]:
        return self._key_sdk_map.get(session_key)

    def get_session_key(self, session_id: str) -> Optional[str]:
        return self._sdk_key_map.get(session_id)

    def remove_session(self, session_key: str) -> None:
        """Remove session"""
        if session_key in self._sessions:
            del self._sessions[session_key]
            logger.debug(f"🗑️ Client removed: {session_key}")

        if session_key in self._locks:
            del self._locks[session_key]

        sdk_id = self._key_sdk_map.pop(session_key, None)
        if sdk_id:
            self._sdk_key_map.pop(sdk_id, None)

        logger.info(f"✅ Session removed: {session_key}")


# Global instance
session_manager = SessionManager()
