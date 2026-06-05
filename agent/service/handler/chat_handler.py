#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : chat_handler.py
# @Date   : 2025/12/06
#
# 2025/12/06   Create
# 2026/2/25    Refactored: session_key routing + Workspace injection
# =====================================================

"""
Chat message handler

[INPUT]: depends on MessageSender/PermissionStrategy from channel.channel,
         depends on session_manager and session_store to manage sessions,
         depends on agent.workspace to build the system prompt,
         depends on ChatMessageProcessor to process SDK responses
[OUTPUT]: exposes ChatHandler
[POS]: core processor in the handler module, responsible for user messages → Agent calls → streaming responses
[PROTOCOL]: update this header when making changes, then check CLAUDE.md
"""

import asyncio
from typing import Any, Dict

from claude_agent_sdk import ClaudeSDKClient, PermissionResult, ToolPermissionContext

from agent.service.agent_manager import agent_manager
from agent.service.channel.channel import MessageSender, PermissionStrategy
from agent.service.handler.base_handler import BaseHandler
from agent.service.process.chat_message_processor import ChatMessageProcessor
from agent.service.session_manager import session_manager
from agent.service.session_store import session_store
from agent.utils.logger import logger


class ChatHandler(BaseHandler):
    """Chat message handler"""

    def __init__(self, sender: MessageSender, permission_strategy: PermissionStrategy):
        super().__init__(sender)
        self.permission_strategy = permission_strategy

    async def handle_chat_message_with_task(
            self,
            message: Dict[str, Any],
            chat_tasks: Dict[str, Any],
    ) -> None:
        """Process chat messages, including task management logic."""
        session_key = message.get("session_key") or message.get("agent_id", "")
        if not session_key:
            await self.send(self.create_error_response(
                error_type="validation_error",
                message="session_key is required for chat messages",
            ))
            return

        # Ensure message contains session_key
        message["session_key"] = session_key

        # Cancel the old task
        if session_key in chat_tasks and not chat_tasks[session_key].done():
            logger.info(f"⚠️ Cancelling old chat task: {session_key}")
            chat_tasks[session_key].cancel()

        task = asyncio.create_task(self.handle_chat_message(message))
        chat_tasks[session_key] = task
        task.add_done_callback(lambda t: self._on_task_done(session_key, t))

    @staticmethod
    def _on_task_done(session_key: str, task: asyncio.Task) -> None:
        """Callback when a chat task completes."""
        if task.cancelled():
            logger.info(f"🛑 Task cancelled: {session_key}")
        elif task.exception():
            logger.error(f"❌ Task exception: {session_key}, error={task.exception()}")
        else:
            logger.debug(f"✅ Task completed: {session_key}")

    async def handle_chat_message(self, message: Dict[str, Any]) -> None:
        """Process chat messages — session_key routing."""
        from agent.service.session.session_router import parse_session_key

        session_key = message.get("session_key") or message.get("agent_id", "")
        agent_id = message.get("agent_id", "")  # Agent ID
        content = message.get("content")
        round_id = message.get("round_id")

        # Extract reliable agent_id from session_key (format: "agent:<agentId>:...")
        if session_key.startswith("agent:"):
            parsed = parse_session_key(session_key)
            agent_id = parsed.get("agent_id") or agent_id

        try:
            client = await self._get_or_create_client(session_key, agent_id)
        except Exception as e:
            logger.error(f"❌ Failed to get client: {e}")
            await self.send(self.create_error_response(
                error_type="client_error",
                message=f"Failed to get or create client: {str(e)}",
                agent_id=session_key,
            ))
            return

        await self._maybe_set_session_title(session_key, agent_id, content)

        async with session_manager.get_lock(session_key):
            logger.info(f"📨 Processing message: key={session_key}, round_id={round_id}")

            await client.query(content)

            processor = ChatMessageProcessor(
                session_key=session_key,
                query=content,
                round_id=round_id,
                agent_id=agent_id,
            )

            async for response_msg in client.receive_messages():
                processed_messages = await processor.process_messages(response_msg)
                for a_message in processed_messages:
                    await self.send(a_message)
                if processor.subtype in ["success", "error"]:
                    break

            logger.info(f"✅ Message processing completed: key={session_key}, {processor.message_count} responses in total")

    @staticmethod
    async def _maybe_set_session_title(session_key: str, agent_id: str, content: str) -> None:
        """Derive a session title from the first user message when none has been set."""
        if not content:
            return

        title = " ".join(content.split())
        if len(title) > 60:
            title = title[:57].rstrip() + "…"
        if not title:
            return

        session = await session_store.get_session_info(session_key)
        if session is not None and session.title not in (None, "", "New Chat"):
            return

        await session_store.update_session(
            session_key=session_key,
            agent_id=agent_id or "main",
            title=title,
        )
        logger.info(f"📝 Session title set: key={session_key}, title={title!r}")

    async def _get_or_create_client(self, session_key: str, agent_id: str = "") -> ClaudeSDKClient:
        """Lazy loading: get or create the SDK client on demand.

        Configuration source priority: Agent Workspace (cwd + prompt) → Agent Options (model + tools)
        The workspace file is reloaded each time the client is created, so changes take effect immediately.
        """
        import os

        from agent.service.session.session_router import parse_session_key

        # 1. Check in-memory cache
        client = await session_manager.get_session(session_key)
        if client:
            logger.debug(f"♻️ Reusing existing session: {session_key}")
            return client

        # 2. Query session storage for the resume session_id
        existing_session = await session_store.get_session_info(session_key)
        session_id = existing_session.session_id if existing_session else None

        # Extract agent_id from session_key (source of truth) since session_key
        # format is "agent:<agentId>:<channel>:<chatType>:<ref>"
        parsed_key = parse_session_key(session_key)
        real_agent_id = parsed_key.get("agent_id") or agent_id or "main"

        # 3. Build SDK options from AgentManager (cwd + prompt + model + tools)
        try:
            sdk_options = await agent_manager.build_sdk_options(real_agent_id)
            logger.info(f"📋 SDK options built from Agent: agent={real_agent_id}")
        except (ValueError, Exception):
            # Use the default configuration when the Agent does not exist; cwd must be provided
            logger.warning(f"⚠️ Agent does not exist: {real_agent_id}, using default configuration")
            sdk_options = {"cwd": os.getcwd()}

        # 4. Resume the existing session
        if session_id:
            sdk_options["resume"] = session_id

        # 5. Create the permission callback
        async def can_use_tool(name: str, data: dict[str, Any], context: ToolPermissionContext) -> PermissionResult:
            if context.tool_use_id is None:
                raise RuntimeError(
                    f"tool_use_id missing from ToolPermissionContext for tool '{name}'; "
                    "cannot route permission request to a specific tool block"
                )
            return await self.permission_strategy.request_permission(
                session_key, name, data, context.tool_use_id
            )

        # 6. Create the client
        client = await session_manager.create_session(
            session_key=session_key,
            can_use_tool=can_use_tool,
            session_id=session_id,
            session_options=sdk_options,
        )

        # 7. Connect to the SDK (fall back to a new session if resume fails)
        try:
            await client.connect()
        except Exception as e:
            if not session_id:
                raise
            logger.warning(f"⚠️ Resume failed, falling back to a new session: {session_key}, error={e}")
            session_manager.remove_session(session_key)
            sdk_options.pop("resume", None)
            client = await session_manager.create_session(
                session_key=session_key,
                can_use_tool=can_use_tool,
                session_id=None,
                session_options=sdk_options,
            )
            await client.connect()

        logger.info(f"✅ Client ready: key={session_key}, agent={real_agent_id}, session_id={session_id}")
        return client
