# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : agent_manager.py
# @Date   : 2026/3/4 15:09
# 2026/3/4 15:09   Create
# =====================================================

"""
Agent Lifecycle Manager

[INPUT]: Depends on db/agent_repository and agent/workspace's AgentWorkspace
[OUTPUT]: Provides AgentManager (Agent creation/query/configuration building)
[POS]: Service layer Agent management center, consumed by ChatHandler and API
[PROTOCOL]: Update this header when changed, then check CLAUDE.md
"""

import re
import shutil
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional

from agent.service.agent.workspace import AgentWorkspace, get_workspace_base_path
from agent.service.db.agent_repository import agent_repository
from agent.service.schema.model_agent import AAgent, AgentOptions
from agent.utils.logger import logger


def _get_data_agents_path() -> Path:
    """Return the path to data/agents/ directory."""
    from agent.core.config import get_agents_data_path

    return Path(get_agents_data_path())


def _parse_skill_frontmatter(skill_md_path: Path) -> Optional[Dict]:
    """Parse YAML frontmatter from a SKILL.md file.

    Returns dict with 'name' and 'description' keys, or None on failure.
    """
    try:
        text = skill_md_path.read_text(encoding="utf-8")
    except Exception:
        return None

    if not text.startswith("---"):
        return None

    end = text.find("---", 3)
    if end < 0:
        return None

    frontmatter = text[3:end].strip()
    yaml_block_indicators = {">-", ">", "|", "|-"}
    result: Dict = {}
    for line in frontmatter.splitlines():
        line = line.strip()
        if ":" in line:
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key in ("name", "description"):
                if val and val not in yaml_block_indicators:
                    result[key] = val
                elif key in result:
                    pass
                else:
                    result[key] = ""

    # Handle multi-line description (YAML >- style)
    if "description" in result and not result["description"]:
        desc_lines = []
        in_desc = False
        for line in frontmatter.splitlines():
            stripped = line.strip()
            if stripped.startswith("description:"):
                in_desc = True
                val_part = stripped[len("description:"):].strip()
                if val_part and val_part not in (">-", ">", "|", "|-"):
                    result["description"] = val_part.strip('"').strip("'")
                    in_desc = False
                continue
            if in_desc:
                if ":" in stripped and not stripped.startswith(" ") and not stripped.startswith("-"):
                    break
                desc_lines.append(stripped)
        if desc_lines:
            result["description"] = " ".join(desc_lines)

    return result if "name" in result else None


class AgentManager:
    """Agent lifecycle management"""

    NAME_MIN_LEN = 2
    NAME_MAX_LEN = 40
    NAME_ALLOWED_PATTERN = re.compile(r"^[\u4e00-\u9fffA-Za-z0-9 _-]+$")

    def __init__(self):
        self._workspaces: Dict[str, AgentWorkspace] = {}

    @classmethod
    def _normalize_agent_name(cls, name: str) -> str:
        """Normalize Agent name (trim whitespace, compress consecutive spaces)."""
        return " ".join((name or "").strip().split())

    @classmethod
    def _build_workspace_dir_name(cls, agent_name: str) -> str:
        """Generate safe directory name from Agent name."""
        normalized = unicodedata.normalize("NFKC", cls._normalize_agent_name(agent_name))
        normalized = normalized.replace(" ", "_")
        safe_name = re.sub(r"[^A-Za-z0-9\u4e00-\u9fff_-]", "_", normalized)
        safe_name = re.sub(r"_+", "_", safe_name).strip("._-")
        return safe_name or "agent"

    @classmethod
    def _resolve_workspace_path(cls, agent_name: str) -> Path:
        """Uniformly calculate Agent workspace path."""
        return get_workspace_base_path() / cls._build_workspace_dir_name(agent_name)

    async def validate_agent_name(
        self,
        name: str,
        exclude_agent_id: Optional[str] = None,
    ) -> dict:
        """Validate Agent name rules, duplication and target workspace conflicts."""
        normalized_name = self._normalize_agent_name(name)
        if not normalized_name:
            return {
                "name": name,
                "normalized_name": normalized_name,
                "is_valid": False,
                "is_available": False,
                "workspace_path": None,
                "reason": "Name cannot be empty",
            }

        if len(normalized_name) < self.NAME_MIN_LEN:
            return {
                "name": name,
                "normalized_name": normalized_name,
                "is_valid": False,
                "is_available": False,
                "workspace_path": None,
                "reason": f"Name must be at least {self.NAME_MIN_LEN} characters",
            }

        if len(normalized_name) > self.NAME_MAX_LEN:
            return {
                "name": name,
                "normalized_name": normalized_name,
                "is_valid": False,
                "is_available": False,
                "workspace_path": None,
                "reason": f"Name cannot exceed {self.NAME_MAX_LEN} characters",
            }

        if not self.NAME_ALLOWED_PATTERN.fullmatch(normalized_name):
            return {
                "name": name,
                "normalized_name": normalized_name,
                "is_valid": False,
                "is_available": False,
                "workspace_path": None,
                "reason": "Only Chinese, English, numbers, spaces, underscores and hyphens are supported",
            }

        expected_workspace = self._resolve_workspace_path(normalized_name)
        expected_workspace_str = str(expected_workspace)

        name_occupied = await agent_repository.exists_active_agent_name(
            normalized_name,
            exclude_agent_id=exclude_agent_id,
        )
        if name_occupied:
            return {
                "name": name,
                "normalized_name": normalized_name,
                "is_valid": True,
                "is_available": False,
                "workspace_path": expected_workspace_str,
                "reason": "Name already exists, please choose another name",
            }

        if expected_workspace.exists():
            if exclude_agent_id:
                current_agent = await agent_repository.get_agent(exclude_agent_id)
                current_path = Path(current_agent.workspace_path).expanduser() if current_agent else None
                if not current_path or current_path != expected_workspace:
                    return {
                        "name": name,
                        "normalized_name": normalized_name,
                        "is_valid": True,
                        "is_available": False,
                        "workspace_path": expected_workspace_str,
                        "reason": "Workspace directory with same name already exists, please choose another name",
                    }
            else:
                return {
                    "name": name,
                    "normalized_name": normalized_name,
                    "is_valid": True,
                    "is_available": False,
                    "workspace_path": expected_workspace_str,
                    "reason": "Workspace directory with same name already exists, please choose another name",
                }

        return {
            "name": name,
            "normalized_name": normalized_name,
            "is_valid": True,
            "is_available": True,
            "workspace_path": expected_workspace_str,
            "reason": None,
        }

    async def _sync_workspace_path(self, agent: AAgent) -> str:
        """Sync Agent's workspace path to 'name directory' rule."""
        expected_path = self._resolve_workspace_path(agent.name)
        current_path = Path(agent.workspace_path).expanduser() if agent.workspace_path else None
        target_path = expected_path

        if current_path and current_path != expected_path:
            if current_path.exists() and not expected_path.exists():
                expected_path.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.move(str(current_path), str(expected_path))
                    logger.info(
                        "✅ Workspace directory migration completed: "
                        f"{current_path} -> {expected_path}"
                    )
                except Exception as exc:
                    logger.warning(
                        "⚠️ Workspace directory migration failed, keeping old directory: "
                        f"{current_path}, error={exc}"
                    )
                    target_path = current_path
            elif current_path.exists() and expected_path.exists():
                logger.warning(
                    "⚠️ Target workspace already exists, keeping current path to avoid overwrite: "
                    f"{current_path} (expected={expected_path})"
                )
                target_path = current_path

        target_path_str = str(target_path)
        if agent.workspace_path != target_path_str:
            await agent_repository.update_agent_workspace_path(agent.agent_id, target_path_str)
            agent.workspace_path = target_path_str
            self._workspaces.pop(agent.agent_id, None)

        return target_path_str

    # =====================================================
    # Agent CRUD
    # =====================================================

    async def create_agent(
        self,
        name: str,
        workspace_path: Optional[str] = None,
        options: Optional[AgentOptions] = None,
    ) -> Optional[AAgent]:
        """Create Agent, automatically initialize workspace directory"""
        validation = await self.validate_agent_name(name)
        if not validation["is_valid"] or not validation["is_available"]:
            raise ValueError(validation["reason"] or "Agent name validation failed")

        normalized_name = validation["normalized_name"]
        resolved_path_str = validation["workspace_path"]
        if not resolved_path_str:
            raise ValueError("Unable to generate workspace path")

        from uuid import uuid4
        agent_id = uuid4().hex[:12]

        # workspace_path is managed by system, frontend value only kept for compatibility
        if workspace_path and str(Path(workspace_path).expanduser()) != resolved_path_str:
            logger.warning(
                "⚠️ workspace_path parameter ignored, using standardized path: "
                f"{resolved_path_str}"
            )

        options_dict = options.model_dump(exclude_none=True) if options else None

        created_id = await agent_repository.create_agent(
            agent_id=agent_id,
            name=normalized_name,
            workspace_path=resolved_path_str,
            options=options_dict,
        )
        if not created_id:
            return None

        # Initialize workspace directory
        workspace = self._get_or_create_workspace(agent_id, resolved_path_str)
        workspace.ensure_initialized(agent_name=normalized_name)

        agent = await agent_repository.get_agent(agent_id)
        logger.info(f"✅ Agent creation completed: {agent_id} ({normalized_name}), workspace={resolved_path_str}")
        return agent

    async def get_agent(self, agent_id: str) -> Optional[AAgent]:
        """Get Agent"""
        return await agent_repository.get_agent(agent_id)

    async def get_all_agents(self) -> List[AAgent]:
        """Get all active Agents"""
        return await agent_repository.get_all_agents()

    async def update_agent(
        self,
        agent_id: str,
        name: Optional[str] = None,
        options: Optional[AgentOptions] = None,
    ) -> bool:
        """Update Agent configuration"""
        existing = await agent_repository.get_agent(agent_id)
        if not existing:
            return False

        normalized_name = None
        if name is not None:
            validation = await self.validate_agent_name(name, exclude_agent_id=agent_id)
            if not validation["is_valid"] or not validation["is_available"]:
                raise ValueError(validation["reason"] or "Agent name validation failed")
            normalized_name = validation["normalized_name"]

        options_dict = options.model_dump(exclude_none=True) if options else None
        updated = await agent_repository.update_agent(
            agent_id,
            name=normalized_name,
            options=options_dict,
        )
        if not updated:
            return False

        latest = await agent_repository.get_agent(agent_id)
        if not latest:
            return False

        synced_path = await self._sync_workspace_path(latest)
        workspace = self._get_or_create_workspace(agent_id, synced_path)
        workspace.ensure_initialized(agent_name=latest.name)
        return True

    async def delete_agent(self, agent_id: str) -> bool:
        """Delete Agent (soft delete)"""
        self._workspaces.pop(agent_id, None)
        return await agent_repository.delete_agent(agent_id)

    # =====================================================
    # Workspace
    # =====================================================

    def get_workspace(self, agent_id: str) -> AgentWorkspace:
        """Get Agent's workspace instance"""
        return self._get_or_create_workspace(agent_id)

    def _get_or_create_workspace(self, agent_id: str, workspace_path: Optional[str] = None) -> AgentWorkspace:
        """Lazily create workspace instance"""
        desired_path = (
            Path(workspace_path).expanduser()
            if workspace_path
            else get_workspace_base_path() / agent_id
        )

        cached = self._workspaces.get(agent_id)
        if cached and cached.path != desired_path:
            logger.warning(f"⚠️ workspace cached path inconsistent, rebuilding instance: {agent_id}, {desired_path}")
            cached = None

        if not cached:
            cached = AgentWorkspace(agent_id, desired_path)
            self._workspaces[agent_id] = cached

        return self._workspaces[agent_id]

    # =====================================================
    # SDK Configuration Building
    # =====================================================

    # Configuration fields not supported by SDK (business layer only)
    _NON_SDK_FIELDS = {"skills_enabled", "setting_sources", "include_partial_messages"}

    async def build_sdk_options(self, agent_id: str) -> dict:
        """Build ClaudeAgentOptions parameters from Agent configuration + Workspace

        Merge order: workspace options (cwd + system_prompt) → agent options (model + tools + ...)
        Re-read workspace files on each call, changes take effect immediately.
        """
        agent = await agent_repository.get_agent(agent_id)
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")

        synced_workspace = await self._sync_workspace_path(agent)

        # Workspace layer: cwd + system_prompt
        workspace = self._get_or_create_workspace(agent_id, synced_workspace)
        workspace.ensure_initialized(agent_name=agent.name)
        agent_opts = agent.options.model_dump(exclude_none=True)
        custom_system_prompt = agent_opts.pop("system_prompt", None)
        sdk_options = workspace.build_sdk_options(custom_system_prompt=custom_system_prompt)

        # Agent layer: model + tools + permissions + ... (filter out non-SDK fields)
        skills_enabled = agent_opts.pop("skills_enabled", False)
        explicit_sources = agent_opts.pop("setting_sources", None)
        for field in self._NON_SDK_FIELDS:
            agent_opts.pop(field, None)
        sdk_options.update(agent_opts)

        # Inject current user's email into MCP server env vars for user-scoped operations
        from agent.core.config import _current_user_email
        user_email = _current_user_email.get()
        if user_email and "mcp_servers" in sdk_options:
            for server_config in sdk_options["mcp_servers"].values():
                if isinstance(server_config, dict):
                    env = server_config.setdefault("env", {})
                    env["BROWSER_MCP_USER_EMAIL"] = user_email

        # Skills: default setting_sources to ["project"] so the SDK discovers
        # SKILL.md files in the agent's workspace (.claude/skills/)
        if skills_enabled or explicit_sources:
            sdk_options["setting_sources"] = explicit_sources or ["project"]

        # Single-skill preload: scan data/agents/<name>/skills/ for SKILL.md files.
        # When exactly one skill is attached, inject a primary skill directive so
        # the model defaults to it without needing to pattern-match the description.
        skills_dir = self._get_agent_skills_dir(agent.name)
        skill_mds = list(skills_dir.glob("*/SKILL.md")) if skills_dir else []
        if len(skill_mds) == 1:
            info = _parse_skill_frontmatter(skill_mds[0])
            if info:
                skill_folder = skill_mds[0].parent.name
                skill_abs_path = str(skill_mds[0].parent)
                preload = (
                    f"\n\n## Primary Skill\n"
                    f"This agent is dedicated to **{info['name']}**. "
                    f"Start every request by reading "
                    f"`{skill_abs_path}/SKILL.md` "
                    f"and following its runbook unless the request is clearly "
                    f"outside its scope: {info.get('description', '')}\n"
                )
                sdk_options["system_prompt"] = (
                    sdk_options.get("system_prompt") or ""
                ) + preload
                if "setting_sources" not in sdk_options:
                    sdk_options["setting_sources"] = ["project"]

        return sdk_options

    # =====================================================
    # Skills
    # =====================================================

    def _get_agent_skills_dir(self, agent_name: str) -> Optional[Path]:
        """Return the skills directory from data/agents/<agent_name>/skills/."""
        data_agents = _get_data_agents_path()
        skills_dir = data_agents / agent_name / "skills"
        if skills_dir.is_dir():
            return skills_dir
        return None

    def list_agent_skills(self, agent_name: str) -> list:
        """List skills attached to an agent by scanning data/agents/<name>/skills/."""
        skills_dir = self._get_agent_skills_dir(agent_name)
        if not skills_dir:
            return []

        result = []
        for skill_dir in sorted(skills_dir.iterdir()):
            if not skill_dir.is_dir():
                continue
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue
            info = _parse_skill_frontmatter(skill_md)
            if info:
                info["path"] = str(skill_dir)
                result.append(info)
        return result


# Global instance
agent_manager = AgentManager()
