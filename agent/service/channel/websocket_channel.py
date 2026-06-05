# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：websocket_channel.py
# @Date   ：2026/2/25 15:45
#
# 2026/2/25 15:45   Create
# =====================================================

"""
WebSocket channel implementation

[INPUT]: depends on fastapi.WebSocket, MessageSender/PermissionStrategy from channel.py,
         and permission-related types from claude_agent_sdk
[OUTPUT]: Exposes WebSocketSender/InteractivePermissionStrategy/WebSocketChannel
[POS]: WebSocket implementation for the channel module; wraps existing WebSocket behavior
       (pure refactor, zero behavior change)
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

import asyncio
import uuid
from typing import Any, Dict, Optional, Union

from claude_agent_sdk import PermissionResult, PermissionResultAllow, PermissionResultDeny
from fastapi import WebSocket
from starlette.websockets import WebSocketState

from agent.service.channel.channel import MessageChannel, MessageSender, PermissionStrategy
from agent.service.process.protocol_adapter import ProtocolAdapter
from agent.service.schema.model_message import AError, AEvent, AMessage
from agent.service.session_manager import session_manager
from agent.utils.logger import logger


# =====================================================
# WebSocketSender — WebSocket message sender
#
# Serializes AMessage/AEvent/AError to JSON and pushes
# them to the frontend via WebSocket. Preserves the
# original BaseHandler.send() behavior.
# =====================================================

class WebSocketSender(MessageSender):
    """WebSocket message sender"""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.protocol_adapter = ProtocolAdapter()

    async def send_message(self, message: AMessage) -> None:
        event = self.protocol_adapter.build_ws_event(message)
        if event is None:
            return

        payload = event.model_dump()
        payload["timestamp"] = payload["timestamp"].isoformat()
        await self.websocket.send_json(payload)
        logger.debug(f"💬 Message sent: {payload}")

    async def send_event(self, event: AEvent) -> None:
        payload = event.model_dump()
        payload["timestamp"] = payload["timestamp"].isoformat()
        await self.websocket.send_json(payload)

    async def send_error(self, error: AError) -> None:
        payload = error.model_dump()
        payload["timestamp"] = payload["timestamp"].isoformat()
        await self.websocket.send_json(payload)


# =====================================================
# InteractivePermissionStrategy — interactive permission strategy
#
# Extracted from the original PermissionHandler. Sends a
# permission request over WebSocket and blocks until the
# user clicks allow/deny in the frontend UI.
# =====================================================

class InteractivePermissionStrategy(PermissionStrategy):
    """Interactive permission strategy — exclusive to the WebSocket channel"""

    def __init__(self, sender: MessageSender):
        self.sender = sender
        self._permission_requests: Dict[str, asyncio.Event] = {}
        self._permission_responses: Dict[str, Dict[str, Any]] = {}

    async def request_permission(
        self,
        agent_id: str,
        tool_name: str,
        input_data: dict[str, Any],
        tool_use_id: str,
    ) -> PermissionResult:
        """Request user permission confirmation via WebSocket"""
        request_id = str(uuid.uuid4())

        logger.info(
            f"🔐 Requesting tool permission: agent_id={agent_id}, tool={tool_name}, "
            f"tool_use_id={tool_use_id}, request_id={request_id}"
        )

        # Create wait event
        event = asyncio.Event()
        self._permission_requests[request_id] = event

        # Send permission request to frontend.
        # tool_use_id is required so the frontend can bind the request to the
        # exact tool_use block, even when several requests share the same name.
        permission_event = AEvent(
            event_type="permission_request",
            agent_id=agent_id,
            session_id=session_manager.get_session_id(agent_id),
            data={
                "request_id": request_id,
                "tool_use_id": tool_use_id,
                "tool_name": tool_name,
                "tool_input": input_data,
            },
        )
        await self.sender.send_event(permission_event)

        # Wait for frontend response (120-second timeout)
        try:
            await asyncio.wait_for(event.wait(), timeout=120.0)

            response = self._permission_responses.get(request_id, {})
            decision = response.get("decision", "deny")

            # Cleanup
            del self._permission_requests[request_id]
            if request_id in self._permission_responses:
                del self._permission_responses[request_id]

            if decision == "allow":
                logger.info(f"✅ Permission allowed: {tool_name}")

                # Special handling for AskUserQuestion
                updated_input = input_data.copy()
                if tool_name == "AskUserQuestion" and "user_answers" in response:
                    user_answers = response["user_answers"]
                    questions = input_data.get("questions", [])
                    answers = {}
                    for answer in user_answers:
                        question_idx = answer.get("questionIndex", 0)
                        selected_options = answer.get("selectedOptions", [])
                        if 0 <= question_idx < len(questions):
                            question_text = questions[question_idx].get("question", "")
                            answers[question_text] = ", ".join(selected_options)
                    updated_input["answers"] = answers
                    logger.info(f"📝 AskUserQuestion user answers: {answers}")

                return PermissionResultAllow(updated_input=updated_input)
            else:
                logger.info(f"❌ Permission denied: {tool_name}")
                return PermissionResultDeny(message=response.get("message", "User denied permission"))

        except asyncio.TimeoutError:
            logger.warning(f"⏰ Permission request timed out: {tool_name}")
            del self._permission_requests[request_id]
            return PermissionResultDeny(message="Permission request timeout")

    def handle_permission_response(self, message: Dict[str, Any]) -> None:
        """Handle the permission response callback from the frontend

        Args:
            message: permission response message from frontend
        """
        request_id = message.get("request_id")
        if not request_id:
            logger.warning("⚠️ permission_response message missing request_id")
            return

        response_data = {
            "decision": message.get("decision", "deny"),
            "message": message.get("message", ""),
        }

        # User answers for AskUserQuestion
        user_answers = message.get("user_answers")
        if user_answers:
            response_data["user_answers"] = user_answers
            logger.debug(f"📝 Received AskUserQuestion user answers: {user_answers}")

        self._permission_responses[request_id] = response_data

        if request_id in self._permission_requests:
            self._permission_requests[request_id].set()
            logger.debug(f"📨 Permission response received: request_id={request_id}, decision={message.get('decision')}")
        else:
            logger.warning(f"⚠️ No matching permission request found: request_id={request_id}")


# =====================================================
# WebSocketChannel — WebSocket channel (no-op placeholder)
#
# The WebSocket lifecycle is managed by FastAPI (created and
# destroyed per connection); no ChannelManager management needed.
# channel_type is used for identification only.
# =====================================================

class WebSocketChannel(MessageChannel):
    """WebSocket channel — lifecycle managed by FastAPI"""

    @property
    def channel_type(self) -> str:
        return "websocket"

    async def start(self) -> None:
        logger.info("📡 WebSocket channel ready (connections managed by FastAPI)")

    async def stop(self) -> None:
        logger.info("📡 WebSocket channel closed")
