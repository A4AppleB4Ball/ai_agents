#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：chat_message_processor.py
# @Date   ：2025/12/06
#
# 2025/12/06   Create
# =====================================================

import uuid
from typing import Any, Optional

from claude_agent_sdk import Message, ResultMessage, SystemMessage, ThinkingBlock, UserMessage
from claude_agent_sdk.types import TextBlock, ToolResultBlock, ToolUseBlock

from agent.core.config import settings
from agent.service.process.sdk_message_processor import sdk_message_processor
from agent.service.schema.model_message import AMessage
from agent.service.session_manager import session_manager
from agent.service.session_store import session_store
from agent.utils.logger import logger


class ChatMessageProcessor:
    """Single-round chat message handler - manages message state and processing logic"""

    def __init__(self, session_key: str, query: str, round_id: Optional[str] = None, agent_id: str = "main"):
        self.query = query
        self.session_key = session_key
        self.agent_id = agent_id
        self.subtype: Optional[str] = None
        # Use round_id if provided by the frontend, otherwise the backend generates it in save_user_message
        self.round_id: Optional[str] = round_id
        self.parent_id: Optional[str] = None
        self.session_id: Optional[str] = None

        self.message_count: int = 0
        self.is_streaming: bool = False
        self.is_streaming_tool: bool = False
        self.is_save_user_message: bool = False
        self.stream_message_id: Optional[str] = None
        self.accumulated_thinking: str = ""
        self.accumulated_signature: str = ""
        self.accumulated_content_blocks: list[Any] = []

    async def process_messages(self, response_msg: Message) -> list[AMessage]:
        """
        Process response message, manage message state

        Args:
            response_msg: Raw response message received from SDK

        Returns:
            processed_messages
        """

        # Print message (only in debug mode)
        if settings.DEBUG:
            sdk_message_processor.print_message(response_msg, self.session_key)

        # Get session_id and establish mapping, save user message (if first time)
        self.set_subtype(response_msg)
        await self.set_session_id(response_msg)
        await self.save_user_message(self.query)

        # Convert to AMessage objects and process
        messages = sdk_message_processor.process_message(
            message=response_msg,
            session_key=self.session_key,
            session_id=self.session_id,
            round_id=self.round_id,
            parent_id=self.parent_id,
            agent_id=self.agent_id,
        )

        # Process all returned messages
        processed_messages = []
        for a_message in messages:
            # Process streaming message state
            self.update_stream_state(a_message)

            # Do not push streaming tool messages
            if a_message.message_type == "stream" and self.is_streaming_tool:
                continue

            # Update parent_id (non-stream messages)
            if a_message.message_type != "stream":
                self.parent_id = a_message.message_id
                await session_store.save_message(a_message)

            processed_messages.append(a_message)
            self.message_count += 1

        return processed_messages

    async def set_session_id(self, response_msg: Message) -> Optional[str]:
        """
        Process session mapping

        Args:
            response_msg: Raw response message received from SDK
        """

        if self.session_id is None:
            if isinstance(response_msg, SystemMessage):
                self.session_id = response_msg.data.get("session_id", None)
            else:
                raise ValueError("⚠️When session_id is None, response_msg must be a SystemMessage")

            # Establish mapping and update database
            await session_manager.register_sdk_session(session_key=self.session_key, session_id=self.session_id)
            logger.debug(f"🔗Mapping established: key={self.session_key} ↔ sdk_session={self.session_id}")

    def set_subtype(self, response_msg: Message) -> None:
        """
        Set message subtype

        Args:
            response_msg: Raw response message received from SDK
        """

        if hasattr(response_msg, 'subtype'):
            self.subtype = response_msg.subtype

        if isinstance(response_msg, ResultMessage):
            if response_msg.subtype == "success":
                self.subtype = "success"
            else:
                self.subtype = "error"

    def update_stream_state(self, a_message: AMessage) -> None:
        """
        Update streaming processing state

        Args:
            a_message: Message object
        """
        if a_message.message_type == "stream" and a_message.message.event["type"] == "message_start":
            # Start streaming, record stream_message_id
            self.is_streaming = True
            self.stream_message_id = a_message.message_id
            self.accumulated_thinking = ""
            self.accumulated_signature = ""
            self.accumulated_content_blocks = []

        if self.is_streaming:
            if a_message.message_type == "stream":
                a_message.message_id = self.stream_message_id
                event_type = a_message.message.event["type"]

                if event_type == "content_block_start":
                    if a_message.message.event["content_block"]["type"] == "tool_use":
                        self.is_streaming_tool = True
                
                elif event_type == "content_block_delta":
                    delta = a_message.message.event.get("delta", {})
                    if delta.get("type") == "thinking_delta":
                        self.accumulated_thinking += delta.get("thinking", "")
                    elif delta.get("type") == "signature_delta":
                        self.accumulated_signature += delta.get("signature", "")

                if self.is_streaming_tool and event_type == "content_block_stop":
                    self.is_streaming_tool = False

            elif a_message.message_type == "assistant":
                if hasattr(self, 'stream_message_id') and self.stream_message_id:
                    a_message.message_id = self.stream_message_id
                self.parent_id = a_message.message_id

                if isinstance(a_message.message.content, list):
                    a_message.message.content = self._merge_assistant_stream_content(a_message.message.content)

        if a_message.message_type == "stream" and a_message.message.event["type"] == "message_stop":
            # Stop streaming, clear stream_message_id
            self.is_streaming = False
            self.stream_message_id = None
            self.accumulated_content_blocks = []

    def _merge_assistant_stream_content(self, incoming_blocks: list[Any]) -> list[Any]:
        """Merge content blocks of the same streaming assistant message to avoid intermediate blocks being overwritten."""
        merged_blocks = list(self.accumulated_content_blocks)

        for block in incoming_blocks:
            self._upsert_content_block(merged_blocks, block)

        # Prefer thinking accumulated from stream events (SDK may not backfill to the final message in some cases)
        if self.accumulated_thinking:
            thinking_block = ThinkingBlock(
                thinking=self.accumulated_thinking,
                signature=self.accumulated_signature
            )
            self._upsert_content_block(merged_blocks, thinking_block)

        self._move_thinking_to_front(merged_blocks)
        self.accumulated_content_blocks = merged_blocks
        return list(merged_blocks)

    @staticmethod
    def _upsert_content_block(content_blocks: list[Any], new_block: Any) -> None:
        """Idempotent update by block type, ensuring tool_use/tool_result/text are not lost."""
        if isinstance(new_block, ThinkingBlock):
            for idx, block in enumerate(content_blocks):
                if isinstance(block, ThinkingBlock):
                    content_blocks[idx] = new_block
                    return
            content_blocks.insert(0, new_block)
            return

        if isinstance(new_block, ToolUseBlock):
            for idx, block in enumerate(content_blocks):
                if isinstance(block, ToolUseBlock) and block.id == new_block.id:
                    content_blocks[idx] = new_block
                    return
            content_blocks.append(new_block)
            return

        if isinstance(new_block, ToolResultBlock):
            for idx, block in enumerate(content_blocks):
                if isinstance(block, ToolResultBlock) and block.tool_use_id == new_block.tool_use_id:
                    content_blocks[idx] = new_block
                    return
            content_blocks.append(new_block)
            return

        if isinstance(new_block, TextBlock):
            for block in content_blocks:
                if isinstance(block, TextBlock) and block.text == new_block.text:
                    return
            content_blocks.append(new_block)
            return

        content_blocks.append(new_block)

    @staticmethod
    def _move_thinking_to_front(content_blocks: list[Any]) -> None:
        """Ensure thinking always stays at the front for stable frontend rendering."""
        thinking_index: Optional[int] = None
        for idx, block in enumerate(content_blocks):
            if isinstance(block, ThinkingBlock):
                thinking_index = idx
                break

        if thinking_index is None or thinking_index == 0:
            return

        thinking_block = content_blocks.pop(thinking_index)
        content_blocks.insert(0, thinking_block)

    async def save_user_message(self, content: str):
        """
        Save user message

        Args:
            content: User message content
        """

        if not self.is_save_user_message:
            # If frontend does not provide round_id, backend generates it
            if not self.round_id:
                self.round_id = str(uuid.uuid4())

            user_message = AMessage(
                session_key=self.session_key,
                agent_id=self.agent_id,
                round_id=self.round_id,
                message_id=self.round_id,
                session_id=self.session_id,
                message_type="user",
                block_type="text",
                message=UserMessage(content=content),
            )

            await session_store.save_message(user_message)

            self.is_save_user_message = True
