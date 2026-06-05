# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：websocket_handler.py
# @Date   ：2025/11/28 15:27
#
# 2025/11/28 15:27   Create
# 2026/2/25          Refactor: Use WebSocketSender + InteractivePermissionStrategy
# =====================================================

"""
WebSocket connection handler

[INPUT]: Depends on fastapi.WebSocket,
         WebSocketSender/InteractivePermissionStrategy from channel.websocket_channel,
         ChatHandler/PermissionHandler/InterruptHandler/PingHandler/ErrorHandler from handler layer
[OUTPUT]: Provides WebSocketHandler
[POS]: WebSocket entry point at service layer, one instance per connection
[PROTOCOL]: Update this header when changes are made, then check CLAUDE.md
"""

import asyncio
from typing import Any, Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from agent.service.channel.websocket_channel import InteractivePermissionStrategy, WebSocketSender
from agent.service.handler import ChatHandler, ErrorHandler, InterruptHandler, PermissionHandler, PingHandler
from agent.service.session.session_router import build_session_key
from agent.service.session_manager import session_manager
from agent.utils.logger import logger


class WebSocketHandler:
    """WebSocket message handler"""

    def __init__(self):
        self.websocket: Optional[WebSocket] = None
        self.chat_tasks: Dict[str, asyncio.Task] = {}

        # Handler instances (initialized on connection)
        self.permission_handler: Optional[PermissionHandler] = None
        self.chat_handler: Optional[ChatHandler] = None
        self.interrupt_handler: Optional[InterruptHandler] = None
        self.ping_handler: Optional[PingHandler] = None
        self.error_handler: Optional[ErrorHandler] = None

    def init_handlers(self, websocket: WebSocket) -> None:
        """Initialize handlers — using WebSocketSender and InteractivePermissionStrategy"""
        sender = WebSocketSender(websocket)
        permission_strategy = InteractivePermissionStrategy(sender)

        self.permission_handler = PermissionHandler(sender, permission_strategy)
        self.chat_handler = ChatHandler(sender, permission_strategy)
        self.interrupt_handler = InterruptHandler(sender)
        self.ping_handler = PingHandler(sender)
        self.error_handler = ErrorHandler(sender)

    async def handle_websocket_connection(self, websocket: WebSocket) -> None:
        """Handle main WebSocket connection logic"""
        self.websocket = websocket
        await self.websocket.accept()
        self.init_handlers(websocket)

        try:
            while True:
                message = await self.websocket.receive_json()
                logger.debug(f"💌 Received message: {message}")
                msg_type = message.get("type")
                await self.on_message(message, msg_type)
        except WebSocketDisconnect as wde:
            raise wde
        except Exception as e:
            await self.error_handler.handle_websocket_error(e)
        finally:
            await self.on_close()

    async def on_message(self, message: Dict[str, Any], msg_type: str) -> None:
        """Route to corresponding handler based on message type"""
        # Convert frontend agent_id to session_key
        if "agent_id" in message and "session_key" not in message:
            message["session_key"] = build_session_key(
                channel="ws", chat_type="dm", ref=message["agent_id"]
            )

        if msg_type == "chat":
            await self.chat_handler.handle_chat_message_with_task(message, self.chat_tasks)
        elif msg_type == "interrupt":
            await self.interrupt_handler.handle_interrupt(message, self.chat_tasks)
        elif msg_type == "permission_response":
            await self.permission_handler.handle_permission_response(message)
        elif msg_type == "ping":
            await self.ping_handler.handle_ping(message)
        else:
            await self.error_handler.handle_unknown_message_type(message)

    async def on_close(self) -> None:
        """Clean up WebSocket connection resources"""
        logger.info("🧹 WebSocket connection cleanup")

        for session_key, task in self.chat_tasks.items():
            if not task.done():
                logger.info(f"🛑 Cleanup: canceling chat task {session_key}")
                task.cancel()

            try:
                client = await session_manager.get_session(session_key)
                if client:
                    await client.interrupt()
                    logger.info(f"⏸️ Cleanup: interrupting SDK generation {session_key}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to interrupt SDK {session_key}: {e}")

        if self.chat_tasks:
            await asyncio.gather(*self.chat_tasks.values(), return_exceptions=True)

        self.chat_tasks.clear()
        self.websocket = None
