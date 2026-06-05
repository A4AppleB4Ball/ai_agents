# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：sdk_message_processor.py
# @Date   ：2025/11/28
# @Description ：Claude Agent SDK message processor, converts SDK message types to JSON format
# =====================================================

import json
import uuid
from dataclasses import asdict
from datetime import datetime
from typing import Any, Dict, List

from claude_agent_sdk.types import AssistantMessage, Message, ResultMessage, StreamEvent, SystemMessage, UserMessage
from claude_agent_sdk.types import ContentBlock, TextBlock, ThinkingBlock, ToolResultBlock, ToolUseBlock

from agent.service.schema.model_message import AMessage
from agent.utils.logger import logger


class SDKMessageProcessor:
    """Claude Agent SDK message processor

    Converts various Claude Agent SDK message types to JSON format,
    adding a type field to identify the message type while preserving raw data.
    """

    def __init__(self):
        """Initialize message processor"""
        self.message_type_mapping = {
            AssistantMessage: "assistant",
            UserMessage: "user",
            SystemMessage: "system",
            ResultMessage: "result",
            StreamEvent: "stream"
        }

        self.content_block_mapping = {
            TextBlock: "text",
            ThinkingBlock: "thinking",
            ToolUseBlock: "tool_use",
            ToolResultBlock: "tool_result"
        }

    def process_message(
            self, message: Message, session_key: str, session_id: str, round_id: str,
            parent_id: str = None, agent_id: str = "main",
    ) -> List[AMessage]:
        """Process Claude Agent SDK message

        Args:
            message: Claude Agent SDK message object
            session_key: Session routing key
            session_id: Session ID
            round_id: Round ID
            parent_id: Parent message ID (optional)
            agent_id: Agent ID

        Returns:
            List[Dict]: JSON-serializable dict list with type field added on top of raw data
        """

        # Only apply special processing to AssistantMessage and UserMessage
        if isinstance(message, (AssistantMessage, UserMessage)):
            messages = self._process_assistant_user_message(message)
        else:
            messages = [message]

        # Other message types keep original logic
        # Special processing for content blocks in content field
        a_messages = []
        for msg in messages:
            block_type = None
            if isinstance(msg, (AssistantMessage, UserMessage)) \
                    and hasattr(msg, 'content') \
                    and isinstance(msg.content, list) \
                    and len(msg.content) > 0:
                if len(msg.content) == 1:
                    block_type = self.content_block_mapping.get(type(msg.content[0]))
                else:
                    block_type = "mixed"

            message_type = self._resolve_message_type(msg)
            message_obj = AMessage(
                message_type=message_type,
                block_type=block_type,
                message=msg,
                message_id=str(uuid.uuid4()),
                agent_id=agent_id,
                session_id=session_id,
                session_key=session_key,
                round_id=round_id,
                parent_id=parent_id,
            )
            a_messages.append(message_obj)

        return a_messages

    def _resolve_message_type(self, msg) -> str:
        """resolve message type, isinstance for subclass support (e.g. TaskStartedMessage -> system)"""
        exact = self.message_type_mapping.get(type(msg))
        if exact:
            return exact
        for cls, type_name in self.message_type_mapping.items():
            if isinstance(msg, cls):
                return type_name
        raise ValueError(f"Unknown message type: {type(msg)}")

    @staticmethod
    def _process_assistant_user_message(message: Message) -> List[Message]:
        """Special conversion logic for AssistantMessage and UserMessage

        Args:
            message: AssistantMessage or UserMessage object

        Returns:
            List[Dict]: Processed message dict list
        """

        # Handle case where content is a string, convert to TextBlock list
        if isinstance(message.content, str):
            # Convert string to TextBlock list
            text_block = TextBlock(text=message.content)
            message.content = [text_block]
            return [message]

        # Handle case where content is a ContentBlock list
        elif isinstance(message.content, list) and len(message.content) > 0:
            return [message]
        else:
            raise ValueError(f"Invalid content type: {type(message.content)}")

    def _process_content_block(self, block: Any) -> Dict[str, Any]:
        """Process a single content block, adding type field to raw data"""
        try:
            # Use asdict to get raw data directly
            result = asdict(block)

            # Add type field
            block_type = self.content_block_mapping.get(type(block), "unknown_block")
            result["type"] = block_type

            return result

        except Exception as e:
            logger.error(f"❌Error processing content block {type(block)}: {e}")
            return {
                "type": "error_block",
                "error": str(e),
                "original_type": str(type(block))
            }

    def print_message(self, message: Message, session_id: str = None) -> None:
        """Pretty print a message to show the agent execution process

        Args:
            message: Claude Agent SDK message object
            session_id: Session ID (optional)
        """
        # Get current timestamp
        is_stream_event = isinstance(message, StreamEvent)
        timestamp = datetime.now().strftime("%H:%M:%S")

        # Print header info
        if not is_stream_event:
            if session_id:
                print(f"🕐 [{timestamp}] 📋 Session: {session_id} - ", end="")
            else:
                print(f"🕐 [{timestamp}] 📋 Agent Message - ", end="")

        # Use raw message directly, bypassing process_message
        if isinstance(message, AssistantMessage):
            self._print_assistant_message(message)
        elif isinstance(message, UserMessage):
            self._print_user_message(message)
        elif isinstance(message, SystemMessage):
            self._print_system_message(message)
        elif isinstance(message, ResultMessage):
            self._print_result_message(message)
        elif isinstance(message, StreamEvent):
            # self._print_stream_event(message)
            ...
        else:
            print(f"❓ Unknown message type: {type(message)}")
            self._print_pretty_json(asdict(message))

        if not is_stream_event:
            print("=" * 80)
            print()

    @staticmethod
    def _print_block(block: ContentBlock) -> None:
        if isinstance(block, TextBlock):
            print(f"💬 Text: {block.text}")
        elif isinstance(block, ThinkingBlock):
            print(f"🤔 Thinking: {block.thinking}")
            print(f"🔑 Signature: {block.signature}")
        elif isinstance(block, ToolResultBlock):
            print(f"🆔 Tool ID: {block.tool_use_id}")
            if block.content:
                print(f"📈 Result: {block.content}")
            if block.is_error:
                print(f" ❌ Tool execution error")
        elif isinstance(block, ToolUseBlock):
            print(f"🔧 Tool call: {block.name}({block.input}) -- {block.id}")

    def _print_user_message(self, message: UserMessage) -> None:
        """Print user message (raw format)"""
        print(f"👤 User message (User Message)")
        print("-" * 40)
        if message.parent_tool_use_id:
            print(f"🔗 Parent tool ID: {message.parent_tool_use_id}")

        content = message.content
        if isinstance(content, str):
            print(f"💬: {content}")
        elif isinstance(content, list):
            if len(content) == 1:
                self._print_block(content[0])
            else:
                for i, block in enumerate(content):
                    print(f"  📝 Block {i + 1}:")
                    self._print_block(block)

    def _print_assistant_message(self, message: AssistantMessage) -> None:
        """Print assistant message (raw format)"""
        print(f"🤖 Assistant reply (Assistant Message) - Model: {message.model}")
        print("-" * 40)
        if message.parent_tool_use_id:
            print(f"🔗 Parent tool ID: {message.parent_tool_use_id}")

        if len(message.content) == 1:
            self._print_block(message.content[0])
        else:
            for i, block in enumerate(message.content):
                print(f"  📦 Content block {i + 1}:")
                # Print raw content block directly
                self._print_block(block)

    @staticmethod
    def _print_system_message(message: SystemMessage) -> None:
        """Print system message (raw format)"""
        print(f"⚙️ System message (System Message) - Type: {message.subtype}")
        print("-" * 40)

        data = message.data
        if data:
            print("📋 Data content:")
            for key, value in data.items():
                print(f"   • {key}: {value}")

    @staticmethod
    def _print_result_message(message: ResultMessage) -> None:
        """Print result message (raw format)"""
        print(f"✅ Execution result (Result Message)")
        print("-" * 40)

        # Key metrics
        print("📊 Execution stats:")
        print(f"   • Duration: {message.duration_ms}ms")
        print(f"   • API duration: {message.duration_api_ms}ms")
        print(f"   • Conversation turns: {message.num_turns}")
        print(f"   • Status: {'✅ Success' if not message.is_error else '❌ Failed'}")

        if message.total_cost_usd:
            print(f"   • Cost: ${message.total_cost_usd:.4f}")

        if message.usage:
            print(f"\n📈 Usage details:")
            for key, value in message.usage.items():
                print(f"   • {key}: {value}")

        if message.result:
            print(f"\n🎯 Result: {message.result}")

    @staticmethod
    def _print_stream_event(message: StreamEvent) -> None:
        """Print stream event (raw format)"""
        print(f"🌊 Stream event (Stream Event)")
        print("-" * 40)
        if message.parent_tool_use_id:
            print(f"🔗 Parent tool ID: {message.parent_tool_use_id}")

        print(f"🆔 UUID: {message.uuid}")
        if message.event:
            event_data = message.event
            print("📦 Event data:")
            for key, value in event_data.items():
                print(f"   • {key}: {value}")

    @staticmethod
    def _print_error_message(message: Dict[str, Any]) -> None:
        """Print error message"""
        print(f"❌ Error message (Error Message)")
        print("-" * 40)

        print(f"🚨 Error: {message.get('error', 'Unknown error')}")
        print(f"🏷️ Original type: {message.get('original_type', 'Unknown')}")

    @staticmethod
    def _print_pretty_json(obj: Any, indent: int = 2) -> None:
        """Pretty print a JSON object"""
        try:
            formatted = json.dumps(obj, indent=indent, ensure_ascii=False)
            print(formatted)
        except Exception as e:
            # If JSON serialization fails, print object directly
            print(obj)
            print(f"❌Error printing JSON: {e}")


# Create global message processor instance
sdk_message_processor = SDKMessageProcessor()
