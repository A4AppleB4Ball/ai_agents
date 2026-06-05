# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：model
# @Date   ：2025/11/28 09:52

# 2025/11/28 09:52   Create
# =====================================================

import uuid
from datetime import datetime
from typing import Any, Dict, Literal, Optional

from claude_agent_sdk.types import AssistantMessage, ResultMessage, StreamEvent, SystemMessage, UserMessage  # noqa
from claude_agent_sdk.types import ContentBlock  # noqa
from claude_agent_sdk.types import Message  # noqa
from claude_agent_sdk.types import TextBlock, ThinkingBlock, ToolResultBlock, ToolUseBlock  # noqa
from pydantic import BaseModel, Field


class AMessage(BaseModel):
    """
    Custom message model wrapping Claude Agent SDK messages.
    For AssistantMessage and UserMessage:
     - if content is ContentBlock with more than one item, split into multiple Messages each containing 1 ContentBlock
     - if content is str, convert to List[TextBlock]
    """
    session_key: str = Field(default="", description="Structured routing key")
    agent_id: str = Field(default="main", description="Agent ID")
    round_id: str = Field(default=..., description="Round conversation ID identifying all messages for a single user question (user message ID)")
    session_id: str = Field(..., description="SDK session ID")
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Message ID")
    message: Message = Field(..., description="Message content")
    message_type: Literal["assistant", "user", "system", "result", "stream"] = Field(..., description="Message type")
    block_type: Optional[str] = Field(default=None, description="Message block type: text, thinking, tool_result, tool_use")
    parent_id: Optional[str] = Field(default=None, description="Parent message ID")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="Timestamp")

    model_config = {"from_attributes": True}


class AEvent(BaseModel):
    event_type: str = Field(..., description="Event type")
    agent_id: str = Field(..., description="Client session ID")
    data: Dict[str, Any] = Field(..., description="Event data")
    session_id: Optional[str] = Field(default=None, description="SDK session ID")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp")


class AStatus(BaseModel):
    """Status response model"""
    success: bool = Field(default=True, description="Whether the operation succeeded")


class AError(BaseModel):
    """Error response model"""
    error_type: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    agent_id: Optional[str] = Field(default=None, description="Client ID")
    session_id: Optional[str] = Field(default=None, description="Session ID")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp")
