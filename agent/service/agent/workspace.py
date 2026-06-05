# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : workspace.py
# @Date   : 2026/2/25 23:15
#
# 2026/2/25 23:15   Create
# 2026/3/4  15:09   Refactor: Changed from global singleton to Agent-level instance
# =====================================================

"""
Agent Workspace Manager

[INPUT]: Depends on settings.WORKSPACE_PATH from agent.core.config
[OUTPUT]: Provides AgentWorkspace class (reads/writes Workspace .md files, builds system prompt and SDK options)
[POS]: Workspace management layer for agent module, consumed by AgentManager
[PROTOCOL]: Update this header when changed, then check CLAUDE.md
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from agent.utils.logger import logger


# =====================================================
# Workspace file definitions (simplified version)
# =====================================================

WORKSPACE_FILES = {
    "agents": "AGENTS.md",   # Agent core rules (identity + style + boundaries + security)
    "user": "USER.md",       # User preferences and collaboration conventions
    "memory": "MEMORY.md",   # Long-term memory and decision records
    "runbook": "RUNBOOK.md", # Workflows, common commands, periodic tasks
}


WORKSPACE_TEMPLATES = {
    "agents": """# AGENTS.md

## Agent Profile

You are `{agent_name}` (`{agent_id}`), this is your long-term workspace.

Default language: English
Working approach: Clarify goals first, then execute, then return results
Risk principle: Must confirm before delete/overwrite/external write operations
Fact principle: Don't fabricate, conclusions must have evidence, clarify boundaries if uncertain

Execution conventions:
- Prioritize actionable results in responses, then add necessary explanations.
- When user explicitly says "remember this", update `MEMORY.md` or `memory/YYYY-MM-DD.md`.
- For long tasks, sync progress by stages.
""",
    "user": """# USER.md

## User Preferences

- Preferred language:
- Response style:
- Expressions to avoid:
- Current focus:
""",
    "memory": """# MEMORY.md

## Long-term Memory

Record stable information that needs to persist across sessions.

- Preferences:
- Constraints:
- Decision records:
""",
    "runbook": """# RUNBOOK.md

## Work Handbook

Created at: {created_at}

### Current Project Context
- Project:
- Goals:
- Constraints:

### Common Commands
- Development:
- Testing:
- Deployment:

### Periodic Tasks (as needed)
- [ ] Daily review of pending items
- [ ] Weekly consolidation of key decisions to `MEMORY.md`
""",
}


class AgentWorkspace:
    """Agent's dedicated workspace

    Each Agent has an independent workspace directory containing prompt files and memories.
    All sessions of an Agent share the same workspace.
    """

    def __init__(self, agent_id: str, workspace_path: Path):
        self.agent_id = agent_id
        self.path = workspace_path

    def ensure_exists(self) -> None:
        """Ensure Workspace directory and subdirectories exist"""
        self.path.mkdir(parents=True, exist_ok=True)
        (self.path / "memory").mkdir(exist_ok=True)
        logger.info(f"📁 Workspace ready: {self.path}")

    def ensure_initialized(self, agent_name: str = "Agent") -> None:
        """Ensure workspace is initialized and default templates are written (only on first creation)."""
        self.ensure_exists()
        self._seed_templates(agent_name=agent_name)
        self._link_skills(agent_name=agent_name)
        self._link_hooks(agent_name=agent_name)
        self._link_settings(agent_name=agent_name)

    def _link_skills(self, agent_name: str) -> None:
        """Symlink data/agents/<name>/skills/ → <workspace>/.claude/skills/

        The Claude Agent SDK discovers skills from <cwd>/.claude/skills/ when
        setting_sources includes "project". The source-of-truth lives under
        data/agents/<name>/skills/, so we expose it to the SDK via a symlink.
        """
        from agent.core.config import get_agents_data_path

        source = Path(get_agents_data_path()) / agent_name / "skills"
        if not source.is_dir():
            return

        target_parent = self.path / ".claude"
        target_parent.mkdir(parents=True, exist_ok=True)
        target = target_parent / "skills"

        if target.is_symlink():
            if target.resolve() == source.resolve():
                return
            target.unlink()
        elif target.exists():
            logger.warning(
                f"⚠️ Skills target exists and is not a symlink, leaving untouched: {target}"
            )
            return

        target.symlink_to(source.resolve(), target_is_directory=True)
        logger.info(f"🔗 Linked skills: {target} → {source}")

    def _link_hooks(self, agent_name: str) -> None:
        """Symlink data/agents/<name>/hooks/ → <workspace>/.claude/hooks/

        Hook scripts live with the agent definition so they are
        version-controlled. settings.json references them via the
        ${CLAUDE_PROJECT_DIR}/.claude/hooks/<file> path.
        """
        from agent.core.config import get_agents_data_path

        source = Path(get_agents_data_path()) / agent_name / "hooks"
        if not source.is_dir():
            return

        target_parent = self.path / ".claude"
        target_parent.mkdir(parents=True, exist_ok=True)
        target = target_parent / "hooks"

        if target.is_symlink():
            if target.resolve() == source.resolve():
                return
            target.unlink()
        elif target.exists():
            logger.warning(
                f"⚠️ Hooks target exists and is not a symlink, leaving untouched: {target}"
            )
            return

        target.symlink_to(source.resolve(), target_is_directory=True)
        logger.info(f"🔗 Linked hooks: {target} → {source}")

    def _link_settings(self, agent_name: str) -> None:
        """Symlink data/agents/<name>/settings.json → <workspace>/.claude/settings.json

        The Claude Agent SDK reads <cwd>/.claude/settings.json when
        setting_sources includes "project". Source-of-truth lives under
        data/agents/<name>/settings.json so per-agent permission policies
        (deny lists, hooks, etc.) are version-controlled.
        """
        from agent.core.config import get_agents_data_path

        source = Path(get_agents_data_path()) / agent_name / "settings.json"
        if not source.is_file():
            return

        target_parent = self.path / ".claude"
        target_parent.mkdir(parents=True, exist_ok=True)
        target = target_parent / "settings.json"

        if target.is_symlink():
            if target.resolve() == source.resolve():
                return
            target.unlink()
        elif target.exists():
            logger.warning(
                f"⚠️ Settings target exists and is not a symlink, leaving untouched: {target}"
            )
            return

        target.symlink_to(source.resolve())
        logger.info(f"🔗 Linked settings: {target} → {source}")

    def _seed_templates(self, agent_name: str) -> None:
        """Write missing template files without overwriting user content."""
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        context = {
            "agent_id": self.agent_id,
            "agent_name": agent_name,
            "created_at": created_at,
        }

        for key, filename in WORKSPACE_FILES.items():
            filepath = self.path / filename
            if filepath.exists():
                continue

            template = WORKSPACE_TEMPLATES.get(key, "").format(**context).strip()
            if not template:
                continue

            filepath.write_text(template + "\n", encoding="utf-8")
            logger.info(f"🧩 Initialize template: {filepath}")

        memory_readme = self.path / "memory" / "README.md"
        if not memory_readme.exists():
            memory_readme.write_text(
                "# memory/\n\n"
                "Record short-term memory by date, e.g., `2026-03-05.md`.\n",
                encoding="utf-8",
            )
            logger.info(f"🧩 Initialize template: {memory_readme}")

    @staticmethod
    def _resolve_filename(name: str) -> Optional[str]:
        """Resolve logical name to filename."""
        return WORKSPACE_FILES.get(name)

    # =====================================================
    # Read/Write
    # =====================================================

    def read_file(self, name: str) -> Optional[str]:
        """Read Workspace file content"""
        filename = self._resolve_filename(name)
        if not filename:
            return None
        filepath = self.path / filename
        if not filepath.exists():
            return None
        return filepath.read_text(encoding="utf-8").strip()

    def write_file(self, name: str, content: str) -> bool:
        """Write to Workspace file"""
        filename = self._resolve_filename(name)
        if not filename:
            logger.warning(f"⚠️ Unknown Workspace file: {name}")
            return False
        filepath = self.path / filename
        filepath.write_text(content, encoding="utf-8")
        logger.info(f"📝 Write to Workspace: {filepath.name}")
        return True

    # =====================================================
    # System Prompt Building
    # =====================================================

    def build_system_prompt(self) -> Optional[str]:
        """Build system prompt from Workspace files

        Read order (simplified):
        AGENTS.md → USER.md → MEMORY.md → RUNBOOK.md

        Skip non-existent files; re-read on each call, changes take effect immediately.
        """
        sections = []
        read_order = ["agents", "user", "memory", "runbook"]
        for name in read_order:
            content = self.read_file(name)
            if content:
                sections.append(content)

        if not sections:
            return None

        return "\n\n---\n\n".join(sections)

    def compose_system_prompt(self, custom_system_prompt: Optional[str] = None) -> Optional[str]:
        """Compose custom system prompt with workspace prompt."""
        workspace_prompt = self.build_system_prompt()
        custom_prompt = (custom_system_prompt or "").strip()

        sections = []
        if custom_prompt:
            sections.append(custom_prompt)
        if workspace_prompt:
            sections.append(workspace_prompt)

        if not sections:
            return None
        return "\n\n---\n\n".join(sections)

    def build_sdk_options(self, custom_system_prompt: Optional[str] = None) -> dict:
        """Build ClaudeAgentOptions workspace-related configuration"""
        options = {"cwd": str(self.path)}
        prompt = self.compose_system_prompt(custom_system_prompt=custom_system_prompt)
        if prompt:
            options["system_prompt"] = prompt
        return options

    # =====================================================
    # Memory Storage
    # =====================================================

    def save_memory(self, filename: str, content: str) -> None:
        """Save session summary to memory/ directory"""
        memory_dir = self.path / "memory"
        memory_dir.mkdir(exist_ok=True)
        filepath = memory_dir / filename
        filepath.write_text(content, encoding="utf-8")
        logger.info(f"💾 Save memory: {filepath}")


# =====================================================
# Workspace Base Path
# =====================================================

def get_workspace_base_path() -> Path:
    """Get the current user's workspace base path."""
    from agent.core.config import get_user_workspace_path

    return Path(get_user_workspace_path())
