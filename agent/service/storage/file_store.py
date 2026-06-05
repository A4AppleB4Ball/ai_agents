# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：file_store.py
# @Date   ：2026/3/9 22:25
# 2026/3/9 22:25   Create
# =====================================================

"""
File storage infrastructure

[INPUT]: depends on the workspace base path and the local filesystem
[OUTPUT]: Exposes path resolution, JSON/JSONL read/write, and legacy SQLite migration
[POS]: Low-level infrastructure of the storage module, reused by Agent/Session Repository
[PROTOCOL]: Update this header when changing this file, then check CLAUDE.md
"""

import base64
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from agent.service.agent.workspace import get_workspace_base_path
from agent.utils.logger import logger


class FileStoragePaths:
    """Manage file storage paths consistently."""

    def __init__(self) -> None:
        from agent.core.config import get_agents_data_path

        self.agents_dir = Path(get_agents_data_path())
        self.agents_index_path = self.agents_dir / "index.json"
        self.legacy_db_path = Path.cwd() / "cache" / "data" / "agent-kit.db"

    @property
    def workspace_base(self) -> Path:
        """Resolved dynamically per-request using the current user context."""
        return get_workspace_base_path()

    def ensure_directories(self) -> None:
        """Ensure the agents directory exists. User workspace is created on-demand per request."""
        self.agents_dir.mkdir(parents=True, exist_ok=True)

    def ensure_workspace_directory(self) -> None:
        """Ensure the current user's workspace directory exists (call within request context)."""
        self.workspace_base.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def build_session_dir_name(session_key: str) -> str:
        """Encode session_key into a safe directory name."""
        encoded = base64.urlsafe_b64encode(session_key.encode("utf-8")).decode("ascii")
        return encoded.rstrip("=")

    def get_agent_file_path(self, workspace_path: str | Path) -> Path:
        """Return the Agent snapshot file path."""
        return Path(workspace_path).expanduser() / "agent.json"

    def get_session_dir(self, workspace_path: str | Path, session_key: str) -> Path:
        """Return the session directory."""
        return Path(workspace_path).expanduser() / "sessions" / self.build_session_dir_name(session_key)

    def get_session_meta_path(self, workspace_path: str | Path, session_key: str) -> Path:
        """Return the session metadata path."""
        return self.get_session_dir(workspace_path, session_key) / "meta.json"

    def get_session_message_log_path(self, workspace_path: str | Path, session_key: str) -> Path:
        """Return the session message log path."""
        return self.get_session_dir(workspace_path, session_key) / "messages.jsonl"


class JsonFileStore:
    """JSON file read/write utility."""

    @staticmethod
    def read_json(path: Path, default: Any) -> Any:
        """Read a JSON file and return the default value if it does not exist."""
        if not path.exists():
            return default

        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning(f"⚠️ Failed to read JSON, using default value: path={path}, error={exc}")
            return default

    @staticmethod
    def write_json(path: Path, payload: Any) -> None:
        """Atomically write a JSON file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = path.with_suffix(path.suffix + ".tmp")
        temp_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(path)

    @staticmethod
    def append_jsonl(path: Path, payload: Dict[str, Any]) -> None:
        """Append one line to a JSONL file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(payload, ensure_ascii=False) + "\n")

    @staticmethod
    def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
        """Overwrite a JSONL file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = path.with_suffix(path.suffix + ".tmp")
        content = "\n".join(json.dumps(row, ensure_ascii=False) for row in rows)
        if content:
            content += "\n"
        temp_path.write_text(content, encoding="utf-8")
        temp_path.replace(path)

    @staticmethod
    def read_jsonl(path: Path) -> List[Dict[str, Any]]:
        """Read a JSONL file."""
        if not path.exists():
            return []

        rows: List[Dict[str, Any]] = []
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                parsed = json.loads(line)
            except Exception as exc:
                logger.warning(f"⚠️ Skipping corrupted JSONL line: path={path}, error={exc}")
                continue
            if isinstance(parsed, dict):
                rows.append(parsed)
        return rows


class FileStorageBootstrap:
    """File storage initializer."""

    _lock = Lock()
    _initialized = False

    def __init__(self) -> None:
        self.paths = FileStoragePaths()

    def ensure_ready(self) -> None:
        """Ensure file storage has been initialized."""
        with self._lock:
            if self.__class__._initialized:
                return

            self.paths.ensure_directories()

            if not self.paths.agents_index_path.exists():
                if self.paths.legacy_db_path.exists():
                    self._migrate_legacy_database()
                else:
                    self._bootstrap_default_agent()

            self.__class__._initialized = True

    def _bootstrap_default_agent(self) -> None:
        """Create the default Agent in a fresh environment."""
        record = {
            "agent_id": "main",
            "name": "main",
            "workspace_path": "main",
            "options": {},
            "created_at": datetime.now().isoformat(),
            "status": "active",
        }
        JsonFileStore.write_json(self.paths.agents_index_path, [record])
        logger.info("Initialized default Agent index")


    def _migrate_legacy_database(self) -> None:
        """Migrate legacy SQLite data to file storage."""
        logger.info(f"🔄 Detected legacy database, starting migration: {self.paths.legacy_db_path}")
        connection: Optional[sqlite3.Connection] = None

        try:
            connection = sqlite3.connect(str(self.paths.legacy_db_path))
            connection.row_factory = sqlite3.Row
            table_names = self._read_table_names(connection)

            agent_records = self._load_legacy_agents(connection, table_names)
            if not agent_records:
                agent_records = self._derive_agents_from_legacy_data(connection, table_names)
            if not agent_records:
                self._bootstrap_default_agent()
                return

            JsonFileStore.write_json(self.paths.agents_index_path, agent_records)
            for agent_record in agent_records:
                wp = agent_record["workspace_path"]
                abs_wp = self.paths.workspace_base / wp if not Path(wp).is_absolute() else Path(wp)
                abs_wp.mkdir(parents=True, exist_ok=True)
                JsonFileStore.write_json(self.paths.get_agent_file_path(abs_wp), agent_record)

            resolved_records = []
            for r in agent_records:
                resolved = dict(r)
                wp = resolved["workspace_path"]
                resolved["workspace_path"] = str(self.paths.workspace_base / wp if not Path(wp).is_absolute() else Path(wp))
                resolved_records.append(resolved)

            session_workspace_map = self._migrate_legacy_sessions(connection, table_names, resolved_records)
            self._migrate_legacy_messages(connection, table_names, session_workspace_map)
            logger.info("✅ Legacy database migration completed, switched to file storage")
        except Exception as exc:
            logger.error(f"❌ Failed to migrate legacy database, falling back to default Agent: {exc}", exc_info=True)
            self._bootstrap_default_agent()
        finally:
            if connection is not None:
                try:
                    connection.close()
                except Exception:
                    pass

    @staticmethod
    def compact_messages(message_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Compact messages by message_id and keep the latest snapshot."""
        latest_by_id: Dict[str, Dict[str, Any]] = {}
        order: List[str] = []

        for row in message_rows:
            message_id = str(row.get("message_id", "")).strip()
            if not message_id:
                continue
            if message_id not in latest_by_id:
                order.append(message_id)
            latest_by_id[message_id] = row

        compacted = [latest_by_id[message_id] for message_id in order]
        compacted.sort(key=lambda item: str(item.get("timestamp") or ""))
        return compacted

    @staticmethod
    def normalize_message_payload(payload: Any) -> Dict[str, Any]:
        """Convert message content from the legacy database into a dict."""
        if isinstance(payload, dict):
            return dict(payload)
        if payload is None:
            return {}
        if isinstance(payload, str):
            try:
                parsed = json.loads(payload)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return {"content": payload}
        return {}

    def _read_table_names(self, connection: sqlite3.Connection) -> set[str]:
        """Read table names from the legacy database."""
        cursor = connection.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return {row["name"] for row in cursor.fetchall()}

    def _load_legacy_agents(
        self,
        connection: sqlite3.Connection,
        table_names: set[str],
    ) -> List[Dict[str, Any]]:
        """Load Agents from the legacy agents table."""
        if "agents" not in table_names:
            return []

        cursor = connection.execute(
            """
            SELECT agent_id, name, workspace_path, options, created_at, status
            FROM agents
            ORDER BY created_at DESC
            """
        )

        records: List[Dict[str, Any]] = []
        for row in cursor.fetchall():
            workspace_name = row["name"] or row["agent_id"]
            options = self.normalize_message_payload(row["options"])
            record = {
                "agent_id": row["agent_id"],
                "name": workspace_name,
                "workspace_path": workspace_name,
                "options": options,
                "created_at": row["created_at"] or datetime.now().isoformat(),
                "status": row["status"] or "active",
            }
            records.append(record)
        return records

    def _derive_agents_from_legacy_data(
        self,
        connection: sqlite3.Connection,
        table_names: set[str],
    ) -> List[Dict[str, Any]]:
        """Derive Agents from sessions and messages when the legacy DB has no agents table."""
        agent_ids: List[str] = []

        if "sessions" in table_names:
            cursor = connection.execute("SELECT DISTINCT agent_id FROM sessions")
            agent_ids.extend([row["agent_id"] for row in cursor.fetchall() if row["agent_id"]])

        if "messages" in table_names:
            cursor = connection.execute("SELECT DISTINCT agent_id FROM messages")
            agent_ids.extend([row["agent_id"] for row in cursor.fetchall() if row["agent_id"]])

        deduplicated_ids: List[str] = []
        for agent_id in agent_ids or ["main"]:
            if agent_id not in deduplicated_ids:
                deduplicated_ids.append(agent_id)

        records: List[Dict[str, Any]] = []
        for agent_id in deduplicated_ids:
            records.append(
                {
                    "agent_id": agent_id,
                    "name": agent_id,
                    "workspace_path": agent_id,
                    "options": {},
                    "created_at": datetime.now().isoformat(),
                    "status": "active",
                }
            )
        return records

    def _migrate_legacy_sessions(
        self,
        connection: sqlite3.Connection,
        table_names: set[str],
        agent_records: List[Dict[str, Any]],
    ) -> Dict[str, str]:
        """Migrate session metadata and return the mapping from session_key to workspace_path."""
        if "sessions" not in table_names:
            return {}

        agent_workspace_map = {
            record["agent_id"]: record["workspace_path"]
            for record in agent_records
        }
        session_workspace_map: Dict[str, str] = {}

        cursor = connection.execute(
            """
            SELECT session_key, agent_id, session_id, channel_type, chat_type, status,
                   created_at, last_activity, title, options
            FROM sessions
            ORDER BY last_activity DESC
            """
        )

        for row in cursor.fetchall():
            agent_id = row["agent_id"] or "main"
            workspace_path = agent_workspace_map.get(agent_id, str(self.paths.workspace_base / agent_id))
            session_key = row["session_key"]
            session_workspace_map[session_key] = workspace_path

            meta = {
                "session_key": session_key,
                "agent_id": agent_id,
                "session_id": row["session_id"],
                "channel_type": row["channel_type"] or "websocket",
                "chat_type": row["chat_type"] or "dm",
                "status": row["status"] or "active",
                "created_at": row["created_at"] or datetime.now().isoformat(),
                "last_activity": row["last_activity"] or row["created_at"] or datetime.now().isoformat(),
                "title": row["title"] or "New Chat",
                "message_count": 0,
                "options": self.normalize_message_payload(row["options"]),
                "latest_round_id": None,
                "round_status": {},
            }
            JsonFileStore.write_json(self.paths.get_session_meta_path(workspace_path, session_key), meta)
        return session_workspace_map

    def _migrate_legacy_messages(
        self,
        connection: sqlite3.Connection,
        table_names: set[str],
        session_workspace_map: Dict[str, str],
    ) -> None:
        """Migrate message logs."""
        if "messages" not in table_names:
            return

        grouped_rows: Dict[str, List[Dict[str, Any]]] = {}
        cursor = connection.execute(
            """
            SELECT message_id, parent_id, session_key, agent_id, round_id, session_id,
                   message_type, block_type, message, timestamp
            FROM messages
            ORDER BY timestamp ASC
            """
        )
        for row in cursor.fetchall():
            session_key = row["session_key"]
            workspace_path = session_workspace_map.get(session_key)
            if not workspace_path:
                workspace_path = str(self.paths.workspace_base / (row["agent_id"] or "main"))
                session_workspace_map[session_key] = workspace_path

            record = {
                "message_id": row["message_id"],
                "parent_id": row["parent_id"],
                "session_key": session_key,
                "agent_id": row["agent_id"] or "main",
                "round_id": row["round_id"],
                "session_id": row["session_id"],
                "message_type": row["message_type"],
                "block_type": row["block_type"],
                "message": self.normalize_message_payload(row["message"]),
                "timestamp": row["timestamp"] or datetime.now().isoformat(),
            }
            grouped_rows.setdefault(session_key, []).append(record)

        for session_key, rows in grouped_rows.items():
            workspace_path = session_workspace_map[session_key]
            log_path = self.paths.get_session_message_log_path(workspace_path, session_key)
            compacted_rows = self.compact_messages(rows)
            for record in compacted_rows:
                JsonFileStore.append_jsonl(log_path, record)

            meta_path = self.paths.get_session_meta_path(workspace_path, session_key)
            meta = JsonFileStore.read_json(meta_path, {})
            meta["message_count"] = len(compacted_rows)
            if compacted_rows:
                latest_message = compacted_rows[-1]
                meta["latest_round_id"] = latest_message.get("round_id")
                meta["last_activity"] = latest_message.get("timestamp") or meta.get("last_activity")
            JsonFileStore.write_json(meta_path, meta)
