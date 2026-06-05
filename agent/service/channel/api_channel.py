"""
API channel implementation

[INPUT]: depends on MessageSender/MessageChannel/PermissionStrategy from channel.py,
         depends on AutoAllowPermissionStrategy from teams_channel.py
[OUTPUT]: Exposes ApiSender/ApiChannel for programmatic (headless) agent invocation
[POS]: API implementation for the channel module; enables non-interactive triggers
       (GitHub Actions, cron, webhooks) to invoke agents without a connected user
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from agent.service.channel.channel import AutoAllowPermissionStrategy, MessageChannel, MessageSender, PermissionStrategy
from agent.service.handler.chat_handler import ChatHandler
from agent.service.schema.model_message import AError, AEvent, AMessage
from agent.service.session.session_router import build_session_key
from agent.service.session_store import session_store
from agent.utils.logger import logger


class ApiSender(MessageSender):
    """Headless message sender — buffers responses in memory.

    No WebSocket, no streaming. Collects all agent outputs so the
    caller can retrieve them after the run completes.
    """

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.messages: list[AMessage] = []
        self.events: list[AEvent] = []
        self.errors: list[AError] = []
        self.completed = False

    async def send_message(self, message: AMessage) -> None:
        self.messages.append(message)
        logger.debug(f"[api:{self.run_id}] message buffered: type={message.message_type}")

    async def send_event(self, event: AEvent) -> None:
        self.events.append(event)
        logger.debug(f"[api:{self.run_id}] event buffered: type={event.event_type}")

    async def send_error(self, error: AError) -> None:
        self.errors.append(error)
        logger.warning(f"[api:{self.run_id}] error buffered: {error.message}")


class ApiRun:
    """Represents a single headless agent run.

    Tracks lifecycle: created → running → completed/failed.
    """

    def __init__(self, run_id: str, agent_id: str, prompt: str):
        self.run_id = run_id
        self.agent_id = agent_id
        self.prompt = prompt
        self.status: str = "created"
        self.created_at: datetime = datetime.now(timezone.utc)
        self.completed_at: Optional[datetime] = None
        self.sender: ApiSender = ApiSender(run_id)
        self.task: Optional[asyncio.Task] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "agent_id": self.agent_id,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "message_count": len(self.sender.messages),
            "error_count": len(self.sender.errors),
        }


class ApiChannel(MessageChannel):
    """API channel — programmatic headless agent invocation.

    Provides fire-and-forget agent runs triggered via REST API.
    Each run gets its own session_key, sender, and permission strategy.
    Runs execute in background asyncio tasks.
    """

    def __init__(self):
        self._runs: dict[str, ApiRun] = {}
        self._max_runs: int = 50

    @property
    def channel_type(self) -> str:
        return "api"

    async def start(self) -> None:
        logger.info("📡 API channel ready (headless agent invocation)")

    async def stop(self) -> None:
        for run in self._runs.values():
            if run.task and not run.task.done():
                run.task.cancel()
        logger.info("📡 API channel stopped")

    async def trigger_run(
        self,
        agent_id: str,
        prompt: str,
        allowed_tools: Optional[set[str]] = None,
    ) -> ApiRun:
        """Start a new headless agent run.

        Args:
            agent_id: Agent to invoke (e.g., "digital_kb")
            prompt: The message to send to the agent
            allowed_tools: Override tool allowlist (defaults to AutoAllowPermissionStrategy.DEFAULT_ALLOWED_TOOLS)

        Returns:
            ApiRun with run_id and status
        """
        self._evict_old_runs()

        run_id = str(uuid.uuid4())
        run = ApiRun(run_id=run_id, agent_id=agent_id, prompt=prompt)
        self._runs[run_id] = run

        permission_strategy = AutoAllowPermissionStrategy(allowed_tools=allowed_tools)

        session_key = build_session_key(
            channel="api",
            chat_type="dm",
            ref=run_id,
            agent_id=agent_id,
        )

        await session_store.create_session_by_key(
            session_key=session_key,
            channel_type="api",
            chat_type="dm",
            title=f"API run: {prompt[:50]}",
        )

        run.status = "running"
        run.task = asyncio.create_task(
            self._execute_run(run, session_key, permission_strategy)
        )
        run.task.add_done_callback(lambda t: self._on_run_done(run, t))

        logger.info(f"🚀 API run started: run_id={run_id}, agent={agent_id}")
        return run

    async def _execute_run(
        self,
        run: ApiRun,
        session_key: str,
        permission_strategy: PermissionStrategy,
    ) -> None:
        """Execute the agent run in a background task."""
        handler = ChatHandler(sender=run.sender, permission_strategy=permission_strategy)

        message = {
            "session_key": session_key,
            "agent_id": run.agent_id,
            "content": run.prompt,
            "round_id": run.run_id,
        }

        await handler.handle_chat_message(message)

    def _on_run_done(self, run: ApiRun, task: asyncio.Task) -> None:
        """Callback when a run task completes."""
        run.completed_at = datetime.now(timezone.utc)
        run.sender.completed = True

        if task.cancelled():
            run.status = "cancelled"
            logger.info(f"🛑 API run cancelled: {run.run_id}")
        elif task.exception():
            run.status = "failed"
            logger.error(f"❌ API run failed: {run.run_id}, error={task.exception()}")
        else:
            run.status = "completed"
            logger.info(f"✅ API run completed: {run.run_id}")

    def get_run(self, run_id: str) -> Optional[ApiRun]:
        """Retrieve a run by ID."""
        return self._runs.get(run_id)

    def list_runs(self, agent_id: Optional[str] = None) -> list[dict[str, Any]]:
        """List runs, optionally filtered by agent_id."""
        runs = self._runs.values()
        if agent_id:
            runs = [r for r in runs if r.agent_id == agent_id]
        return [r.to_dict() for r in sorted(runs, key=lambda r: r.created_at, reverse=True)]

    def _evict_old_runs(self) -> None:
        """Remove oldest completed runs when at capacity."""
        if len(self._runs) < self._max_runs:
            return

        completed = [
            r for r in self._runs.values()
            if r.status in ("completed", "failed", "cancelled")
        ]
        completed.sort(key=lambda r: r.created_at)

        while len(self._runs) >= self._max_runs and completed:
            old = completed.pop(0)
            del self._runs[old.run_id]


# Global singleton
api_channel = ApiChannel()
