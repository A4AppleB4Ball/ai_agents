# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：model_agent.py
# @Date   ：2026/3/4 15:09
# 2026/3/4 15:09   Create
# =====================================================

"""
Agent Pydantic Models

[INPUT]: depends on pydantic
[OUTPUT]: exposes AAgent / AgentOptions / CreateAgentRequest / UpdateAgentRequest
[POS]: Agent model definitions in the schema module, consumed by agent_manager/agent_repository/api_agent
[PROTOCOL]: update this header on change, then check CLAUDE.md
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# =====================================================
# Agent configuration — mapped to ClaudeAgentOptions
# =====================================================

class AgentOptions(BaseModel):
    """Agent-level configuration, corresponding to Agent-layer fields of ClaudeAgentOptions"""
    model: Optional[str] = Field(default=None, description="Model selection")
    permission_mode: Optional[str] = Field(default=None, description="Permission mode")
    allowed_tools: Optional[list[str]] = Field(default=None, description="Tool allowlist")
    disallowed_tools: Optional[list[str]] = Field(default=None, description="Tool denylist")
    system_prompt: Optional[str] = Field(default=None, description="Additional system prompt")
    max_turns: Optional[int] = Field(default=None, description="Maximum turns")
    max_thinking_tokens: Optional[int] = Field(default=None, description="Thinking token limit")
    include_partial_messages: bool = Field(default=True, description="Whether the frontend shows streaming intermediate messages")
    mcp_servers: Optional[dict] = Field(default=None, description="MCP server configuration")
    skills_enabled: bool = Field(default=False, description="Whether skills are enabled")
    setting_sources: Optional[list[str]] = Field(default=None, description="Skill loading sources")

    model_config = {"from_attributes": True}


# =====================================================
# Agent model
# =====================================================

class AAgent(BaseModel):
    """Agent model — one Agent = one workspace"""
    agent_id: str = Field(..., description="Unique Agent identifier")
    name: str = Field(..., description="Display name")
    workspace_path: str = Field(default="", description="Workspace path (system-managed: ~/.digital-ai-agents/workspace/<agent_name_slug>)")
    global_: bool = Field(default=False, alias="global", description="Seeded by image; cannot be deleted by users")
    options: AgentOptions = Field(default_factory=AgentOptions, description="Agent configuration")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation time")
    status: str = Field(default="active", description="Status: active/archived")

    model_config = {"from_attributes": True, "populate_by_name": True}


# =====================================================
# Request models
# =====================================================

class CreateAgentRequest(BaseModel):
    """Create Agent request"""
    name: str = Field(..., description="Agent name")
    workspace_path: Optional[str] = Field(default=None, description="Compatibility field, currently auto-managed by the backend")
    options: Optional[AgentOptions] = Field(default=None, description="Initial configuration")


class UpdateAgentRequest(BaseModel):
    """Update Agent request"""
    name: Optional[str] = Field(default=None, description="Name")
    options: Optional[AgentOptions] = Field(default=None, description="Configuration")


class ValidateAgentNameResponse(BaseModel):
    """Agent name validation result"""
    name: str = Field(..., description="Original input name")
    normalized_name: str = Field(..., description="Normalized name")
    is_valid: bool = Field(..., description="Whether the name meets naming rules")
    is_available: bool = Field(..., description="Whether the name is available (not a duplicate)")
    workspace_path: Optional[str] = Field(default=None, description="Expected workspace path")
    reason: Optional[str] = Field(default=None, description="Reason for unavailability")
