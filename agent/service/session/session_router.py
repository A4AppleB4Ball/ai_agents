# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：session_router.py
# @Date   ：2026/2/25 23:10
#
# 2026/2/25 23:10   Create
# =====================================================

"""
Session Router

[INPUT]: depends on session_store session read/write methods
[OUTPUT]: exposes build_session_key / resolve_session
[POS]: Core routing logic in the session module, consumed by the Channel layer
[PROTOCOL]: update this header on change, then check CLAUDE.md
"""

from typing import Optional

from agent.utils.logger import logger

# =====================================================
# Constants
# =====================================================

# Single-Agent mode, hard-coded. Change to dynamic lookup when multi-Agent support is added.
AGENT_ID = "main"


# =====================================================
# Session Key build
#
# Format: agent:<agentId>:<channel>:<chatType>:<ref>[:topic:<threadId>]
# Deterministic routing — session can be located without a database query
# =====================================================

def build_session_key(
    channel: str,
    chat_type: str,
    ref: str,
    thread_id: Optional[str] = None,
    agent_id: str = AGENT_ID,
) -> str:
    """Build a structured Session Key

    Args:
        channel: Channel identifier (ws / teams)
        chat_type: Session type (dm / group)
        ref: Locator identifier within the channel
        thread_id: Thread/Topic ID (optional)
        agent_id: Agent ID (currently fixed as "main")

    Returns:
        Session Key string

    Examples:
        >>> build_session_key("ws", "dm", "abc-123")
        'agent:main:ws:dm:abc-123'
        >>> build_session_key("teams", "group", "123:456", thread_id="789")
        'agent:main:teams:group:123:456:topic:789'
    """
    key = f"agent:{agent_id}:{channel}:{chat_type}:{ref}"
    if thread_id:
        key += f":topic:{thread_id}"
    return key


def parse_session_key(session_key: str) -> dict:
    """Parse a Session Key into structured fields

    Returns:
        dict: {agent_id, channel, chat_type, ref, thread_id?}
    """
    parts = session_key.split(":")
    # agent:<agentId>:<channel>:<chatType>:<ref...>[:topic:<threadId>]
    result = {
        "agent_id": parts[1] if len(parts) > 1 else AGENT_ID,
        "channel": parts[2] if len(parts) > 2 else "",
        "chat_type": parts[3] if len(parts) > 3 else "dm",
    }

    # Find the :topic: boundary
    topic_idx = None
    for i, part in enumerate(parts):
        if part == "topic" and i >= 4:
            topic_idx = i
            break

    if topic_idx:
        result["ref"] = ":".join(parts[4:topic_idx])
        result["thread_id"] = ":".join(parts[topic_idx + 1:])
    else:
        result["ref"] = ":".join(parts[4:])
        result["thread_id"] = None

    return result


async def resolve_session(
    channel: str,
    chat_type: str,
    ref: str,
    thread_id: Optional[str] = None,
) -> "Session":
    """Route to an existing Session or create a new one

    Args:
        channel: Channel identifier
        chat_type: Session type
        ref: Locator identifier within the channel
        thread_id: Thread ID

    Returns:
        Session model object
    """
    from agent.service.session_store import session_store

    session_key = build_session_key(channel, chat_type, ref, thread_id)

    # 1. Look for an existing active Session
    existing = await session_store.get_session_by_key(session_key)
    if existing and existing.status == "active":
        logger.debug(f"♻️ Reusing session: {session_key}")
        return existing

    # 2. Create a new Session
    logger.info(f"✨ Creating new session: {session_key}")
    return await session_store.create_session_by_key(
        session_key=session_key,
        channel_type=channel,
        chat_type=chat_type,
    )
