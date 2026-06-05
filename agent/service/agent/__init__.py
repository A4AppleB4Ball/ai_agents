# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : __init__.py
# @Date   : 2026/2/25 23:15
#
# 2026/2/25 23:15   Create
# =====================================================

"""
Agent module

[OUTPUT]: Provides AgentWorkspace, get_workspace_base_path
[POS]: Module entry point for agent/service/agent
[PROTOCOL]: Update this header when changed, then check CLAUDE.md
"""

from agent.service.agent.workspace import AgentWorkspace, get_workspace_base_path

__all__ = ["AgentWorkspace", "get_workspace_base_path"]
