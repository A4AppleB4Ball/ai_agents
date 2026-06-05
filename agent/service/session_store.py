# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：session_store.py
# @Date   ：2025/11/28 22:29
#
# 2025/11/28 22:29   Create
# 2026/2/25          Refactor: session_key routing
# =====================================================

"""
Message history storage

[INPUT]: Depends on file-based session_repository
[OUTPUT]: Provides MessageHistoryStore (business layer operations for sessions and messages)
[POS]: Storage facade at service layer, consumed by ChatHandler/SessionManager/API
[PROTOCOL]: Update this header when changes are made, then check CLAUDE.md
"""

from typing import List, Optional

from agent.service.db.session_repository import session_repository
from agent.service.schema.model_message import AMessage
from agent.service.schema.model_session import ASession
from agent.utils.logger import logger


class MessageHistoryStore:
    """Message history storage — session_key routing"""

    def __init__(self):
        logger.info("📁 History storage initialized: using workspace file storage")

    # =====================================================
    # Session operations — indexed by session_key
    # =====================================================

    async def get_session_by_key(self, session_key: str) -> Optional[ASession]:
        """Get session by session_key"""
        return await session_repository.get_session(session_key)

    async def create_session_by_key(
            self,
            session_key: str,
            channel_type: str = "websocket",
            chat_type: str = "dm",
            title: Optional[str] = None,
    ) -> Optional[ASession]:
        """Create new session and return"""
        success = await session_repository.create_session(
            session_key=session_key,
            channel_type=channel_type,
            chat_type=chat_type,
            title=title or "New Chat",
        )
        if success:
            return await session_repository.get_session(session_key)
        return None

    async def get_session_info(self, session_key: str) -> Optional[ASession]:
        """Get session information"""
        return await session_repository.get_session(session_key)

    async def update_session(
            self,
            session_key: str,
            agent_id: str = "main",
            session_id: Optional[str] = None,
            title: Optional[str] = None,
    ) -> bool:
        """Create or update session"""
        existing = await session_repository.get_session(session_key)
        if not existing:
            return await session_repository.create_session(
                session_key=session_key,
                agent_id=agent_id,
                session_id=session_id,
                title=title or "New Chat",
            )
        return await session_repository.update_session(
            session_key=session_key,
            session_id=session_id,
            title=title,
        )

    async def get_all_sessions(self) -> List[ASession]:
        """Get all session list"""
        return await session_repository.get_all_sessions()

    async def delete_session(self, session_key: str) -> bool:
        """Delete session"""
        return await session_repository.delete_session(session_key)

    # =====================================================
    # Message operations
    # =====================================================

    async def save_message(self, message: AMessage) -> bool:
        """Save message"""
        try:
            session_info = await session_repository.get_session(message.session_key)
            if not session_info:
                logger.error(f"❌ Session not found: {message.session_key}")
                return False
            return await session_repository.create_message(message=message)
        except Exception as e:
            logger.error(f"❌ Failed to save message: {e}")
            return False

    async def get_session_messages(self, session_key: str) -> List[AMessage]:
        """Get session message history"""
        return await session_repository.get_session_messages(session_key)

    async def delete_round(self, session_key: str, round_id: str) -> int:
        """Delete a conversation round"""
        return await session_repository.delete_round(session_key, round_id)

    async def get_latest_round_id(self, session_key: str) -> Optional[str]:
        """Get latest round_id"""
        return await session_repository.get_latest_round_id(session_key)

    async def has_round_result(self, session_key: str, round_id: str) -> bool:
        """Check if the specified round has a result message."""
        return await session_repository.has_round_result(session_key, round_id)


# Global instance
session_store = MessageHistoryStore()
