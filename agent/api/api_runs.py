"""
API Runs — REST endpoints for headless agent invocation

[INPUT]: depends on api_channel singleton from channel.api_channel
[OUTPUT]: Exposes /runs endpoints (trigger, status, list)
[POS]: API layer for programmatic agent runs, consumed by GitHub Actions / webhooks / cron
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agent.service.channel.api_channel import api_channel
from agent.utils.logger import logger

router = APIRouter(prefix="/runs", tags=["runs"])


class TriggerRunRequest(BaseModel):
    agent_id: str = Field(..., description="Agent to invoke (e.g., 'digital_kb')")
    prompt: str = Field(..., description="Message to send to the agent")
    allowed_tools: Optional[list[str]] = Field(
        default=None,
        description="Override tool allowlist. Defaults to standard set if omitted.",
    )


class TriggerRunResponse(BaseModel):
    run_id: str
    agent_id: str
    status: str


@router.post("", response_model=TriggerRunResponse)
async def trigger_run(request: TriggerRunRequest):
    """Trigger a headless agent run.

    The agent executes in the background. Use GET /runs/{run_id} to check status.
    """
    allowed_tools_set = set(request.allowed_tools) if request.allowed_tools else None

    run = await api_channel.trigger_run(
        agent_id=request.agent_id,
        prompt=request.prompt,
        allowed_tools=allowed_tools_set,
    )

    logger.info(f"API run triggered: run_id={run.run_id}, agent={request.agent_id}")

    return TriggerRunResponse(
        run_id=run.run_id,
        agent_id=run.agent_id,
        status=run.status,
    )


@router.get("/{run_id}")
async def get_run(run_id: str):
    """Get status of a specific run."""
    run = api_channel.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run.to_dict()


@router.get("")
async def list_runs(agent_id: Optional[str] = None):
    """List recent runs, optionally filtered by agent_id."""
    return api_channel.list_runs(agent_id=agent_id)
