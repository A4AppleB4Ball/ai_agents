#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : interrupt_handler.py
# @Date   : 2025/12/06
#
# 2025/12/06   Create
# 2026/2/26    Refactored: session_key routing
# =====================================================

"""
Interrupt message processor

[INPUT]: depends on session_manager and session_store
[OUTPUT]: exposes InterruptHandler
[POS]: Interrupt handler in the handler module, part of WebSocket inbound message routing
[PROTOCOL]: update this header when making changes, then check CLAUDE.md
"""

import asyncio
import uuid
from typing import Any, Dict, Optional

from claude_agent_sdk.types import ResultMessage

from agent.service.handler.base_handler import BaseHandler
from agent.service.schema.model_message import AMessage
from agent.service.session_manager import session_manager
from agent.service.session_store import session_store
from agent.utils.logger import logger


class InterruptHandler(BaseHandler):
    """Interrupt message processor."""

    async def handle_interrupt(self, message: Dict[str, Any], chat_tasks: Dict[str, asyncio.Task]) -> None:
        """Process interrupt messages."""
        session_key = message.get("session_key") or message.get("agent_id", "")
        round_id = message.get("round_id")
        if not session_key:
            logger.warning("⚠️ Interrupt message is missing session_key")
            return

        asyncio.create_task(self._handle_interrupt_async(session_key, chat_tasks, round_id))

    async def _handle_interrupt_async(
            self, session_key: str, chat_tasks: Dict[str, asyncio.Task], round_id: Optional[str] = None
    ) -> None:
        """Execute the interrupt flow asynchronously."""
        try:
            # 1. Call SDK interrupt
            client = await session_manager.get_session(session_key)
            if client:
                await client.interrupt()
                logger.info(f"⏸️ Interrupting session: key={session_key}")
            else:
                logger.warning(f"⚠️ Session client not found: key={session_key}")
                return

            # 2. Wait for the task to end naturally (up to 10 seconds)
            chat_task = chat_tasks.get(session_key)
            if chat_task and not chat_task.done():
                try:
                    await asyncio.wait_for(chat_task, timeout=10.0)
                    logger.info(f"✅ Task ended naturally: {session_key}")
                except asyncio.TimeoutError:
                    # 3. Force cancel on timeout
                    logger.info(f"🛑 Force cancelling task: {session_key}")
                    chat_task.cancel()
                    try:
                        await chat_task
                    except asyncio.CancelledError:
                        pass
            elif chat_task and chat_task.done():
                logger.info(f"✅ Task already ended: {session_key}")
            else:
                logger.warning(f"⚠️ Task not found: {session_key}")

            # Ensure this round has a terminal result whether it ended naturally or was force-cancelled
            await self._send_interrupt_result(session_key, round_id)

        except Exception as e:
            logger.error(f"❌ Interrupt processing failed: {e}")

    async def _send_interrupt_result(self, session_key: str, round_id: Optional[str] = None) -> None:
        """Send the interrupt result message."""
        session_id = session_manager.get_session_id(session_key)
        if not round_id:
            round_id = await session_store.get_latest_round_id(session_key)

        if not round_id:
            logger.warning(f"⚠️ Unable to get round_id: key={session_key}")
            return

        # Avoid sending duplicate results (for example, if the task already produced success/error naturally)
        if await session_store.has_round_result(session_key, round_id):
            logger.info(f"ℹ️ Skipping interrupt result: round already has a result, key={session_key}, round_id={round_id}")
            return

        result_message = AMessage(
            session_key=session_key,
            round_id=round_id,
            session_id=session_id,
            message_id=str(uuid.uuid4()),
            message=ResultMessage(
                subtype="interrupted",
                duration_ms=0,
                duration_api_ms=0,
                is_error=True,
                num_turns=0,
                session_id=session_id,
                total_cost_usd=0,
                usage={
                    "input_tokens": 0,
                    "cache_creation_input_tokens": 0,
                    "cache_read_input_tokens": 0,
                    "output_tokens": 0,
                    "server_tool_use": {"web_search_requests": 0, "web_fetch_requests": 0},
                    "service_tier": "standard",
                    "cache_creation": {"ephemeral_1h_input_tokens": 0, "ephemeral_5m_input_tokens": 0},
                },
                result="Interrupted by user",
            ),
            message_type="result",
        )

        await session_store.save_message(result_message)
        logger.info(f"💾 Saved interrupt message: key={session_key}, round_id={round_id}")

        await self.send(result_message)
