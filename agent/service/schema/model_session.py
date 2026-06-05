# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：model_session
# @Date   ：2025/11/29 11:12
#
# 2025/11/29 11:12   Create
# 2026/2/25          Refactored: added session_key routing support
# =====================================================

"""
Session Pydantic Models

[INPUT]: depends on pydantic
[OUTPUT]: exposes ASession / UpdateTitleRequest
[POS]: Session model definitions in the schema module, consumed by session_store/session_repository
[PROTOCOL]: update this header on change, then check CLAUDE.md
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ASession(BaseModel):
    """Session model"""
    session_key: str = Field(..., description="Structured routing key")
    agent_id: str = Field(default="main", description="Agent ID")
    session_id: Optional[str] = Field(default=None, description="SDK session ID")
    channel_type: str = Field(default="websocket", description="Channel type")
    chat_type: str = Field(default="dm", description="Session type")
    status: str = Field(default="active", description="Session status")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation time")
    last_activity: datetime = Field(default_factory=datetime.now, description="Last activity time")
    title: Optional[str] = Field(default=None, description="Session title")
    message_count: int = Field(0, description="Message count")

    model_config = {"from_attributes": True}


class UpdateTitleRequest(BaseModel):
    title: str
