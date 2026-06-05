# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：session_repository
# @Date   ：2026/3/9 22:40
# 2026/3/9 22:40   Create
# =====================================================

"""
Session repository

[INPUT]: depends on the file storage layer, Agent Repository, and schema models
[OUTPUT]: Exposes SessionRepository (session CRUD + message CRUD)
[POS]: Data access layer of the db module, consumed by session_store
[PROTOCOL]: Update this header when changing this file, then check CLAUDE.md
"""

import json
import shutil
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

from agent.service.db.agent_repository import agent_repository
from agent.service.schema.model_message import AMessage
from agent.service.schema.model_session import ASession
from agent.service.storage.file_store import FileStorageBootstrap, FileStoragePaths, JsonFileStore
from agent.utils.logger import logger


class SessionRepository:
    """Session repository based on the workspace filesystem."""

    def __init__(self) -> None:
        self._bootstrap = FileStorageBootstrap()
        self._paths = FileStoragePaths()
        self._lock = Lock()
        self._bootstrap.ensure_ready()

    @staticmethod
    def _to_message_dict(message_obj: Any) -> Dict[str, Any]:
        """Convert a message object into a serializable dict."""
        if message_obj is None:
            return {}
        if isinstance(message_obj, dict):
            return dict(message_obj)
        if isinstance(message_obj, str):
            return {"content": message_obj}
        if hasattr(message_obj, "model_dump"):
            return message_obj.model_dump(mode="json")
        return asdict(message_obj)

    @staticmethod
    def _coerce_payload_dict(message_type: str, payload: Any) -> Dict[str, Any]:
        """Convert any payload into a dict whenever possible."""
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
                pass

            if message_type in ("assistant", "user"):
                return {"content": payload}
            if message_type == "system":
                return {"subtype": "info", "data": {"raw": payload}}
            if message_type == "result":
                return {"subtype": "error", "result": payload, "is_error": True}
            return {}

        try:
            return SessionRepository._to_message_dict(payload)
        except Exception:
            return {}

    @staticmethod
    def _normalize_message_payload(message_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize historical message structures for compatibility with dirty legacy data."""
        normalized = dict(payload or {})

        if message_type == "user":
            tool_use_result = normalized.get("tool_use_result")
            if isinstance(tool_use_result, str):
                normalized["tool_use_result"] = {"error": tool_use_result}
            elif tool_use_result is not None and not isinstance(tool_use_result, dict):
                normalized["tool_use_result"] = {"value": tool_use_result}
            return normalized

        if message_type == "assistant":
            normalized.setdefault("model", "")
            return normalized

        if message_type == "system":
            normalized.setdefault("subtype", "info")
            normalized.setdefault("data", {})
            return normalized

        if message_type == "result":
            normalized.setdefault("subtype", "error" if normalized.get("is_error") else "success")
            normalized.setdefault("duration_ms", 0)
            normalized.setdefault("duration_api_ms", 0)
            normalized.setdefault("num_turns", 0)
            normalized.setdefault("session_id", "")
            normalized.setdefault("is_error", False)
            return normalized

        return normalized

    async def _resolve_workspace_path(self, agent_id: str) -> Path:
        """Resolve the workspace path by agent_id."""
        agent = await agent_repository.get_agent(agent_id)
        if agent and agent.workspace_path:
            return Path(agent.workspace_path).expanduser()
        return self._paths.workspace_base / agent_id

    def _iter_known_workspace_paths(self) -> List[Path]:
        """Return all currently known workspace paths."""
        records = JsonFileStore.read_json(self._paths.agents_index_path, [])
        paths: List[Path] = []
        workspace_base = self._paths.workspace_base

        for record in records if isinstance(records, list) else []:
            workspace_path = record.get("workspace_path")
            if not workspace_path:
                continue
            wp = Path(str(workspace_path))
            if not wp.is_absolute():
                wp = workspace_base / wp
            wp = wp.expanduser()
            if wp not in paths:
                paths.append(wp)

        if workspace_base not in paths:
            paths.append(workspace_base)
        return paths

    def _find_session_meta_path(self, session_key: str, workspace_path: Optional[Path] = None) -> Optional[Path]:
        """Locate session meta.json."""
        session_dir_name = self._paths.build_session_dir_name(session_key)
        if workspace_path is not None:
            candidate = workspace_path / "sessions" / session_dir_name / "meta.json"
            return candidate if candidate.exists() else None

        for root_path in self._iter_known_workspace_paths():
            candidate = root_path / "sessions" / session_dir_name / "meta.json"
            if candidate.exists():
                return candidate

            for meta_path in root_path.glob(f"*/sessions/{session_dir_name}/meta.json"):
                return meta_path
        return None

    def _find_message_log_path(self, session_key: str, workspace_path: Optional[Path] = None) -> Optional[Path]:
        """Locate messages.jsonl."""
        meta_path = self._find_session_meta_path(session_key, workspace_path=workspace_path)
        if not meta_path:
            return None
        return meta_path.parent / "messages.jsonl"

    @staticmethod
    def _ensure_aware_iso(value: Any) -> str:
        """Normalize a timestamp to a timezone-aware ISO 8601 string in UTC.

        Older session metadata may have been written without timezone info; mixing
        naive and aware datetimes breaks comparison/sorting downstream.
        """
        if not value:
            return datetime.now(timezone.utc).isoformat()
        if isinstance(value, datetime):
            dt = value
        else:
            try:
                dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except ValueError:
                return datetime.now(timezone.utc).isoformat()
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    @staticmethod
    def _session_from_meta(meta: Dict[str, Any]) -> ASession:
        """Convert meta.json into ASession."""
        return ASession(
            session_key=meta["session_key"],
            agent_id=meta.get("agent_id") or "main",
            session_id=meta.get("session_id"),
            channel_type=meta.get("channel_type") or "websocket",
            chat_type=meta.get("chat_type") or "dm",
            status=meta.get("status") or "active",
            created_at=SessionRepository._ensure_aware_iso(meta.get("created_at")),
            last_activity=SessionRepository._ensure_aware_iso(meta.get("last_activity")),
            title=meta.get("title") or "New Chat",
            message_count=int(meta.get("message_count") or 0),
        )

    @staticmethod
    def _message_record_from_message(message: AMessage) -> Dict[str, Any]:
        """Convert AMessage into a JSONL record."""
        payload = SessionRepository._normalize_message_payload(
            message.message_type,
            SessionRepository._to_message_dict(message.message),
        )
        timestamp = message.timestamp or datetime.now(timezone.utc)
        return {
            "message_id": message.message_id,
            "parent_id": message.parent_id,
            "session_key": message.session_key,
            "agent_id": message.agent_id,
            "round_id": message.round_id,
            "session_id": message.session_id,
            "message_type": message.message_type,
            "block_type": message.block_type,
            "message": payload,
            "timestamp": timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp),
        }

    def _load_raw_message_rows(self, log_path: Optional[Path]) -> List[Dict[str, Any]]:
        """Read the raw message log."""
        if not log_path:
            return []
        return JsonFileStore.read_jsonl(log_path)

    def _load_compacted_message_rows(self, log_path: Optional[Path]) -> List[Dict[str, Any]]:
        """Read compacted message snapshots."""
        raw_rows = self._load_raw_message_rows(log_path)
        compacted = self._bootstrap.compact_messages(raw_rows)
        return compacted

    @staticmethod
    def _build_round_status(message_rows: List[Dict[str, Any]]) -> Dict[str, str]:
        """Build round status from message snapshots."""
        status_map: Dict[str, str] = {}
        for row in message_rows:
            round_id = row.get("round_id")
            if not round_id:
                continue

            status_map.setdefault(round_id, "running")
            if row.get("message_type") == "result":
                payload = row.get("message") or {}
                status_map[round_id] = str(payload.get("subtype") or "success")
        return status_map

    def _refresh_meta_from_messages(self, meta: Dict[str, Any], message_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Refresh meta from the current message snapshots."""
        compacted_rows = self._bootstrap.compact_messages(message_rows)
        meta["message_count"] = len(compacted_rows)
        meta["round_status"] = self._build_round_status(compacted_rows)
        meta["latest_round_id"] = compacted_rows[-1].get("round_id") if compacted_rows else None

        if compacted_rows:
            latest_timestamp = compacted_rows[-1].get("timestamp")
            if latest_timestamp:
                meta["last_activity"] = latest_timestamp
        return meta

    def _write_session_meta(self, meta_path: Path, meta: Dict[str, Any]) -> None:
        """Write session metadata."""
        JsonFileStore.write_json(meta_path, meta)

    def _materialize_unfinished_rounds(
        self,
        session_key: str,
        meta: Dict[str, Any],
        message_rows: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Add interrupted tool_result and result entries for unfinished rounds."""
        rows = [dict(row) for row in message_rows]
        round_status = dict(meta.get("round_status") or self._build_round_status(rows))

        for round_id, status in round_status.items():
            if not round_id or status != "running":
                continue

            round_rows = [row for row in rows if row.get("round_id") == round_id]
            if not round_rows:
                continue

            has_result = any(row.get("message_type") == "result" for row in round_rows)
            tool_result_ids: set[str] = set()
            tool_use_rows: List[Dict[str, Any]] = []

            for row in round_rows:
                if row.get("message_type") != "assistant":
                    continue

                payload = self._coerce_payload_dict("assistant", row.get("message"))
                content = payload.get("content")
                if not isinstance(content, list):
                    continue

                for block in content:
                    if not isinstance(block, dict):
                        continue
                    if block.get("type") == "tool_result" and block.get("tool_use_id"):
                        tool_result_ids.add(str(block["tool_use_id"]))
                    if block.get("type") == "tool_use" and block.get("id"):
                        tool_use_rows.append(row)

            for row in tool_use_rows:
                payload = self._coerce_payload_dict("assistant", row.get("message"))
                content = list(payload.get("content") or [])
                changed = False

                for block in content:
                    if not isinstance(block, dict):
                        continue
                    if block.get("type") != "tool_use" or not block.get("id"):
                        continue

                    tool_use_id = str(block["id"])
                    if tool_use_id in tool_result_ids:
                        continue

                    content.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": "task interrupted (page refresh or connection lost)",
                            "is_error": True,
                        }
                    )
                    tool_result_ids.add(tool_use_id)
                    changed = True

                if changed:
                    payload["content"] = content
                    row["message"] = payload

            if has_result:
                continue

            last_row = round_rows[-1]
            rows.append(
                {
                    "message_id": f"interrupted_result_{round_id}_{uuid.uuid4().hex[:8]}",
                    "parent_id": last_row.get("message_id"),
                    "session_key": session_key,
                    "agent_id": last_row.get("agent_id") or meta.get("agent_id") or "main",
                    "round_id": round_id,
                    "session_id": last_row.get("session_id") or meta.get("session_id") or "",
                    "message_type": "result",
                    "block_type": None,
                    "message": {
                        "subtype": "interrupted",
                        "duration_ms": 0,
                        "duration_api_ms": 0,
                        "num_turns": 0,
                        "session_id": last_row.get("session_id") or meta.get("session_id") or "",
                        "total_cost_usd": 0,
                        "usage": {
                            "input_tokens": 0,
                            "output_tokens": 0,
                            "cache_creation_input_tokens": 0,
                            "cache_read_input_tokens": 0,
                        },
                        "result": "task interrupted (page refresh or connection lost)",
                        "is_error": True,
                    },
                    "timestamp": last_row.get("timestamp") or datetime.now().isoformat(),
                }
            )

        rows.sort(key=lambda item: str(item.get("timestamp") or ""))
        return rows

    async def create_session(
        self,
        session_key: str,
        channel_type: str = "websocket",
        chat_type: str = "dm",
        agent_id: str = "main",
        session_id: Optional[str] = None,
        title: Optional[str] = None,
    ) -> bool:
        """Create a new session."""
        try:
            workspace_path = await self._resolve_workspace_path(agent_id)
            meta_path = self._paths.get_session_meta_path(workspace_path, session_key)
            log_path = self._paths.get_session_message_log_path(workspace_path, session_key)

            with self._lock:
                if meta_path.exists():
                    logger.info(f"ℹ️ Session already exists: key={session_key}")
                    return True

                now = datetime.now(timezone.utc).isoformat()
                meta = {
                    "session_key": session_key,
                    "agent_id": agent_id,
                    "session_id": session_id,
                    "channel_type": channel_type,
                    "chat_type": chat_type,
                    "status": "active",
                    "created_at": now,
                    "last_activity": now,
                    "title": title or "New Chat",
                    "message_count": 0,
                    "latest_round_id": None,
                    "round_status": {},
                }
                self._write_session_meta(meta_path, meta)
                log_path.parent.mkdir(parents=True, exist_ok=True)
                if not log_path.exists():
                    JsonFileStore.write_jsonl(log_path, [])

            logger.info(f"✅ Created session: key={session_key}")
            return True
        except Exception as exc:
            logger.error(f"❌ Failed to create session: {exc}", exc_info=True)
            return False

    async def get_session(self, session_key: str) -> Optional[ASession]:
        """Get a session by session_key."""
        try:
            meta_path = self._find_session_meta_path(session_key)
            if not meta_path:
                return None
            meta = JsonFileStore.read_json(meta_path, {})
            if not meta:
                return None
            return self._session_from_meta(meta)
        except Exception as exc:
            logger.error(f"❌ Failed to get session: {exc}", exc_info=True)
            return None

    async def update_session(
        self,
        session_key: str,
        session_id: Optional[str] = None,
        title: Optional[str] = None,
        status: Optional[str] = None,
    ) -> bool:
        """Update session information."""
        try:
            meta_path = self._find_session_meta_path(session_key)
            if not meta_path:
                return False

            with self._lock:
                meta = JsonFileStore.read_json(meta_path, {})
                if not meta:
                    return False

                if session_id is not None:
                    meta["session_id"] = session_id
                if title is not None:
                    meta["title"] = title
                # Clean up legacy session-level execution config to avoid exposing an incorrect contract.
                meta.pop("options", None)
                if status is not None:
                    meta["status"] = status
                meta["last_activity"] = datetime.now(timezone.utc).isoformat()
                self._write_session_meta(meta_path, meta)

            logger.info(f"🔄 Updated session: key={session_key}")
            return True
        except Exception as exc:
            logger.error(f"❌ Failed to update session: {exc}", exc_info=True)
            return False

    async def get_all_sessions(self) -> List[ASession]:
        """Get all sessions."""
        sessions: List[ASession] = []
        try:
            seen_paths: set[Path] = set()
            for workspace_path in self._iter_known_workspace_paths():
                for meta_path in workspace_path.glob("sessions/*/meta.json"):
                    if meta_path in seen_paths:
                        continue
                    seen_paths.add(meta_path)
                    meta = JsonFileStore.read_json(meta_path, {})
                    if not meta:
                        continue
                    try:
                        sessions.append(self._session_from_meta(meta))
                    except Exception as exc:
                        logger.warning(f"⚠️ Skipping corrupted session metadata: path={meta_path}, error={exc}")
            sessions.sort(key=lambda item: item.last_activity, reverse=True)
            logger.info(f"📋 Loaded session list: total {len(sessions)}")
            return sessions
        except Exception as exc:
            logger.error(f"❌ Failed to load session list: {exc}", exc_info=True)
            return []

    async def delete_session(self, session_key: str) -> bool:
        """Delete a session and all its messages."""
        try:
            meta_path = self._find_session_meta_path(session_key)
            if not meta_path:
                return False

            with self._lock:
                shutil.rmtree(meta_path.parent, ignore_errors=True)

            logger.info(f"🗑️ Deleted session: key={session_key}")
            return True
        except Exception as exc:
            logger.error(f"❌ Failed to delete session: {exc}", exc_info=True)
            return False

    async def delete_round(self, session_key: str, round_id: str) -> int:
        """Delete one conversation round."""
        try:
            meta_path = self._find_session_meta_path(session_key)
            log_path = self._find_message_log_path(session_key)
            if not meta_path or not log_path:
                return 0

            with self._lock:
                raw_rows = self._load_raw_message_rows(log_path)
                deleted_count = len([row for row in raw_rows if row.get("round_id") == round_id])
                remaining_rows = [row for row in raw_rows if row.get("round_id") != round_id]
                JsonFileStore.write_jsonl(log_path, remaining_rows)

                meta = JsonFileStore.read_json(meta_path, {})
                refreshed_meta = self._refresh_meta_from_messages(meta, remaining_rows)
                self._write_session_meta(meta_path, refreshed_meta)

            logger.info(f"🗑️ Deleted round: key={session_key}, round={round_id}, total {deleted_count}")
            return deleted_count
        except Exception as exc:
            logger.error(f"❌ Failed to delete round: {exc}", exc_info=True)
            return -1

    async def get_latest_round_id(self, session_key: str) -> Optional[str]:
        """Get the latest round_id."""
        try:
            compacted_rows = self._load_compacted_message_rows(self._find_message_log_path(session_key))
            if not compacted_rows:
                return None
            return compacted_rows[-1].get("round_id")
        except Exception as exc:
            logger.error(f"❌ Failed to get latest round_id: {exc}", exc_info=True)
            return None

    async def has_round_result(self, session_key: str, round_id: str) -> bool:
        """Check whether the specified round already has a result message."""
        try:
            compacted_rows = self._load_compacted_message_rows(self._find_message_log_path(session_key))
            for row in compacted_rows:
                if row.get("round_id") == round_id and row.get("message_type") == "result":
                    return True
            return False
        except Exception as exc:
            logger.error(f"❌ Failed to check round result: key={session_key}, round={round_id}, error={exc}")
            return False

    async def create_message(self, message: AMessage) -> bool:
        """Save a message."""
        try:
            meta_path = self._find_session_meta_path(message.session_key)
            log_path = self._find_message_log_path(message.session_key)
            if not meta_path or not log_path:
                logger.error(f"❌ Failed to save message, session does not exist: {message.session_key}")
                return False

            with self._lock:
                record = self._message_record_from_message(message)
                JsonFileStore.append_jsonl(log_path, record)

                raw_rows = self._load_raw_message_rows(log_path)
                meta = JsonFileStore.read_json(meta_path, {})
                meta["agent_id"] = message.agent_id
                meta["session_id"] = message.session_id
                refreshed_meta = self._refresh_meta_from_messages(meta, raw_rows)
                self._write_session_meta(meta_path, refreshed_meta)
            return True
        except Exception as exc:
            logger.error(f"❌ Failed to save message: {exc}", exc_info=True)
            return False

    async def get_session_messages(self, session_key: str) -> List[AMessage]:
        """Get all historical messages for the session."""
        try:
            meta_path = self._find_session_meta_path(session_key)
            meta = JsonFileStore.read_json(meta_path, {}) if meta_path else {}
            compacted_rows = self._load_compacted_message_rows(self._find_message_log_path(session_key))
            materialized_rows = self._materialize_unfinished_rounds(session_key, meta, compacted_rows)
            message_list: List[AMessage] = []
            for row in materialized_rows:
                try:
                    normalized_payload = self._normalize_message_payload(
                        row.get("message_type") or "",
                        self._coerce_payload_dict(row.get("message_type") or "", row.get("message")),
                    )
                    message_list.append(
                        AMessage(
                            session_key=row.get("session_key") or session_key,
                            agent_id=row.get("agent_id") or "main",
                            round_id=row.get("round_id"),
                            session_id=row.get("session_id") or "",
                            message_id=row.get("message_id"),
                            message=normalized_payload,
                            message_type=row.get("message_type"),
                            block_type=row.get("block_type"),
                            parent_id=row.get("parent_id"),
                            timestamp=row.get("timestamp"),
                        )
                    )
                except Exception as exc:
                    logger.warning(
                        f"⚠️ Skipping malformed message: id={row.get('message_id')}, "
                        f"type={row.get('message_type')}, error={exc}"
                    )
            logger.info(f"📥 Loaded historical messages: key={session_key}, total {len(message_list)}")
            return message_list
        except Exception as exc:
            logger.error(f"❌ Failed to get historical messages: {exc}", exc_info=True)
            return []


session_repository = SessionRepository()
