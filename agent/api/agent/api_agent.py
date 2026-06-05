# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : api_agent.py
# @Date   : 2026/3/4 15:09
# 2026/3/4 15:09   Create
# =====================================================

"""
Agent API

[INPUT]: Depends on agent_manager and session_store
[OUTPUT]: Provides /agents CRUD endpoints + Agent session queries
[POS]: API layer Agent management endpoints, consumed by frontend
[PROTOCOL]: Update this header when changed, then check CLAUDE.md
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from agent.service.agent_manager import agent_manager
from agent.service.schema.model_agent import (
    AAgent,
    CreateAgentRequest,
    UpdateAgentRequest,
)
from agent.service.session_store import session_store
from agent.shared.server.common import resp

router = APIRouter(tags=["agent"])


# =====================================================
# Agent CRUD
# =====================================================

@router.get("/agents", response_model=List[AAgent])
async def get_agents():
    """Get all Agent list"""
    agents = await agent_manager.get_all_agents()
    data = [a.model_dump(by_alias=True) for a in agents]
    return resp.ok(resp.Resp(data=data))


@router.post("/agents")
async def create_agent(request: CreateAgentRequest):
    """Create new Agent"""
    try:
        agent = await agent_manager.create_agent(
            name=request.name,
            workspace_path=request.workspace_path,
            options=request.options,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not agent:
        raise HTTPException(status_code=500, detail="Failed to create agent")
    return resp.ok(resp.Resp(data=agent.model_dump(by_alias=True)))


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get Agent configuration"""
    agent = await agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return resp.ok(resp.Resp(data=agent.model_dump(by_alias=True)))


@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update Agent configuration"""
    existing = await agent_manager.get_agent(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")

    try:
        success = await agent_manager.update_agent(
            agent_id=agent_id,
            name=request.name,
            options=request.options,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update agent")

    agent = await agent_manager.get_agent(agent_id)
    return resp.ok(resp.Resp(data=agent.model_dump(by_alias=True)))


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete Agent (soft delete). Global agents cannot be deleted."""
    agent = await agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.global_:
        raise HTTPException(status_code=403, detail="Global agents cannot be deleted")
    success = await agent_manager.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete agent")
    return resp.ok(resp.Resp(data={"success": True}))


@router.get("/agents/validate/name")
async def validate_agent_name(name: str, exclude_agent_id: Optional[str] = None):
    """Validate if Agent name is valid and not duplicate."""
    result = await agent_manager.validate_agent_name(name, exclude_agent_id=exclude_agent_id)
    return resp.ok(resp.Resp(data=result))


# =====================================================
# Agent Sessions
# =====================================================

@router.get("/agents/{agent_id}/sessions")
async def get_agent_sessions(agent_id: str):
    """Get all sessions for an Agent"""
    agent = await agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    all_sessions = await session_store.get_all_sessions()
    # Filter sessions belonging to this Agent
    agent_sessions = [s for s in all_sessions if s.agent_id == agent_id]
    data = [s.model_dump() for s in agent_sessions]
    return resp.ok(resp.Resp(data=data))


# =====================================================
# Agent Skills
# =====================================================

@router.get("/agents/{agent_id}/skills")
async def get_agent_skills(agent_id: str):
    """List skills attached to an Agent (read from data/agents/<name>/skills/)"""
    agent = await agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    skills = agent_manager.list_agent_skills(agent.name)
    return resp.ok(resp.Resp(data=skills))
