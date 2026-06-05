# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：agent_repository.py
# @Date   ：2026/3/9 22:31
# 2026/3/9 22:31   Create
# =====================================================

"""
Agent repository

[INPUT]: depends on the file storage layer and AAgent from schema/model_agent
[OUTPUT]: Exposes AgentRepository (Agent CRUD)
[POS]: Agent persistence layer in the db module, consumed by agent_manager
[PROTOCOL]: Update this header when changing this file, then check CLAUDE.md
"""

from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional

from agent.service.schema.model_agent import AAgent, AgentOptions
from agent.service.storage.file_store import FileStorageBootstrap, FileStoragePaths, JsonFileStore
from agent.utils.logger import logger


def _get_data_agents_path() -> Path:
    """Return the path to data/agents/ directory."""
    from agent.core.config import get_agents_data_path

    return Path(get_agents_data_path())


class AgentRepository:
    """File-based Agent repository."""

    def __init__(self) -> None:
        self._bootstrap = FileStorageBootstrap()
        self._paths = FileStoragePaths()
        self._lock = Lock()
        self._bootstrap.ensure_ready()

    def _resolve_workspace(self, relative_path: str) -> str:
        """Resolve a relative workspace path to an absolute path using WORKSPACE_PATH."""
        if not relative_path:
            return str(self._paths.workspace_base)
        return str(self._paths.workspace_base / relative_path)

    def _to_relative_workspace(self, absolute_path: str) -> str:
        """Convert an absolute workspace path to relative (for storage in index)."""
        abs_path = Path(absolute_path).expanduser().resolve()
        base = self._paths.workspace_base.resolve()
        try:
            return str(abs_path.relative_to(base))
        except ValueError:
            return abs_path.name

    def _load_records(self) -> List[Dict]:
        """Read the Agent index, resolving relative workspace paths."""
        self._bootstrap.ensure_ready()
        records = JsonFileStore.read_json(self._paths.agents_index_path, [])
        if not isinstance(records, list):
            return []
        for record in records:
            wp = record.get("workspace_path", "")
            if not Path(wp).is_absolute():
                record["workspace_path"] = self._resolve_workspace(wp)
            else:
                record["workspace_path"] = wp
        return records

    def _write_records(self, records: List[Dict]) -> None:
        """Write back the Agent index with relative workspace paths."""
        storage_records = []
        for record in records:
            stored = dict(record)
            wp = stored.get("workspace_path", "")
            if Path(wp).is_absolute():
                stored["workspace_path"] = self._to_relative_workspace(wp)
            storage_records.append(stored)
        JsonFileStore.write_json(self._paths.agents_index_path, storage_records)

    def _write_agent_snapshot(self, record: Dict) -> None:
        """Sync the Agent snapshot to its workspace."""
        workspace_path = Path(record["workspace_path"]).expanduser()
        workspace_path.mkdir(parents=True, exist_ok=True)
        JsonFileStore.write_json(self._paths.get_agent_file_path(workspace_path), record)

    @staticmethod
    def _to_model(record: Dict) -> AAgent:
        """Convert a dict record into AAgent."""
        return AAgent(
            agent_id=record["agent_id"],
            name=record["name"],
            workspace_path=record["workspace_path"],
            **{"global": record.get("global", False)},
            options=AgentOptions(**(record.get("options") or {})),
            created_at=record.get("created_at") or datetime.now().isoformat(),
            status=record.get("status") or "active",
        )

    async def create_agent(
        self,
        agent_id: str,
        name: str,
        workspace_path: str,
        options: Optional[Dict] = None,
    ) -> Optional[str]:
        """Create an Agent and return its agent_id."""
        with self._lock:
            records = self._load_records()
            if any(record.get("agent_id") == agent_id for record in records):
                logger.warning(f"⚠️ Agent already exists, skipping create: {agent_id}")
                return None

            record = {
                "agent_id": agent_id,
                "name": name,
                "workspace_path": workspace_path,
                "options": options or {},
                "created_at": datetime.now().isoformat(),
                "status": "active",
            }
            records.append(record)
            self._write_records(records)
            self._write_agent_snapshot(record)
            logger.info(f"✅ Agent created successfully: {agent_id} ({name})")
            return agent_id

    async def get_agent(self, agent_id: str) -> Optional[AAgent]:
        """Get an Agent by agent_id (checks index first, then data/agents/)."""
        records = self._load_records()
        for record in records:
            if record.get("agent_id") == agent_id:
                return self._to_model(record)

        for data_record in self._load_data_agents():
            if data_record["agent_id"] == agent_id:
                return self._to_model(data_record)

        return None

    def _load_data_agents(self) -> List[Dict]:
        """Scan data/agents/ directory and return agent records for each subdirectory."""
        data_agents_dir = _get_data_agents_path()
        if not data_agents_dir.is_dir():
            return []

        records = []
        for agent_dir in sorted(data_agents_dir.iterdir()):
            if not agent_dir.is_dir():
                continue
            agent_name = agent_dir.name
            workspace_path = self._paths.workspace_base / agent_name
            records.append({
                "agent_id": agent_name,
                "name": agent_name,
                "workspace_path": str(workspace_path),
                "options": {
                    "skills_enabled": True,
                    "setting_sources": ["project"],
                },
                "created_at": datetime.now().isoformat(),
                "status": "active",
                "global": True,
            })
        return records

    async def get_all_agents(self) -> List[AAgent]:
        """Get all active Agents (from index + data/agents/)."""
        records = self._load_records()
        active_records = [record for record in records if record.get("status", "active") == "active"]

        existing_ids = {r.get("agent_id", "") for r in active_records}
        existing_names = {r.get("name", "").lower() for r in active_records}
        for data_record in self._load_data_agents():
            if data_record["agent_id"] in existing_ids:
                continue
            if data_record["name"].lower() not in existing_names:
                active_records.append(data_record)
                existing_ids.add(data_record["agent_id"])
                existing_names.add(data_record["name"].lower())

        active_records.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return [self._to_model(record) for record in active_records]

    async def exists_active_agent_name(
        self,
        name: str,
        exclude_agent_id: Optional[str] = None,
    ) -> bool:
        """Check whether an active Agent name already exists."""
        normalized = name.lower()
        for record in self._load_records():
            if record.get("status", "active") != "active":
                continue
            if exclude_agent_id and record.get("agent_id") == exclude_agent_id:
                continue
            if str(record.get("name", "")).lower() == normalized:
                return True
        return False

    async def update_agent(
        self,
        agent_id: str,
        name: Optional[str] = None,
        options: Optional[Dict] = None,
    ) -> bool:
        """Update an Agent."""
        with self._lock:
            records = self._load_records()
            for record in records:
                if record.get("agent_id") != agent_id:
                    continue

                if name is not None:
                    record["name"] = name
                if options is not None:
                    merged_options = dict(record.get("options") or {})
                    merged_options.update(options)
                    record["options"] = merged_options

                self._write_records(records)
                self._write_agent_snapshot(record)
                logger.info(f"✅ Agent updated successfully: {agent_id}")
                return True

        return False

    async def update_agent_workspace_path(self, agent_id: str, workspace_path: str) -> bool:
        """Update the Agent workspace path."""
        with self._lock:
            records = self._load_records()
            for record in records:
                if record.get("agent_id") != agent_id:
                    continue

                record["workspace_path"] = workspace_path
                self._write_records(records)
                self._write_agent_snapshot(record)
                logger.info(f"✅ Agent workspace_path updated: {agent_id} -> {workspace_path}")
                return True

        return False

    async def delete_agent(self, agent_id: str) -> bool:
        """Soft-delete an Agent."""
        with self._lock:
            records = self._load_records()
            for record in records:
                if record.get("agent_id") != agent_id:
                    continue

                record["status"] = "archived"
                self._write_records(records)
                self._write_agent_snapshot(record)
                logger.info(f"🗑️ Agent archived: {agent_id}")
                return True

        return False


agent_repository = AgentRepository()
