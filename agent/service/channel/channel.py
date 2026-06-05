# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：channel.py
# @Date   ：2026/2/25 15:45
#
# 2026/2/25 15:45   Create
# =====================================================

"""
Core channel protocol definitions

[INPUT]: depends on agent.service.schema.model_message for AMessage/AEvent/AError,
         depends on claude_agent_sdk for PermissionResult
[OUTPUT]: Exposes three abstract protocols: MessageSender/MessageChannel/PermissionStrategy
[POS]: Protocol definition layer for the channel module; all channel implementations must follow these protocols
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, Set, Union

from claude_agent_sdk import PermissionResult, PermissionResultAllow, PermissionResultDeny

from agent.service.schema.model_message import AError, AEvent, AMessage
from agent.utils.logger import logger


# =====================================================
# MessageSender — message sending protocol
#
# Replaces the hard-coded WebSocket dependency in BaseHandler.
# All handlers send messages through this protocol without
# knowing the underlying transport.
# =====================================================

class MessageSender(ABC):
    """Message sending protocol — the sole exit point for the handler layer"""

    async def send(self, message: Union[AMessage, AEvent, AError]) -> None:
        """Unified send entry point, automatically dispatches to concrete methods"""
        if isinstance(message, AMessage):
            await self.send_message(message)
        elif isinstance(message, AEvent):
            await self.send_event(message)
        elif isinstance(message, AError):
            await self.send_error(message)

    @abstractmethod
    async def send_message(self, message: AMessage) -> None:
        """Send an Agent message (assistant reply / user message / system message / result)"""
        ...

    @abstractmethod
    async def send_event(self, event: AEvent) -> None:
        """Send an event (permission requests, etc.)"""
        ...

    @abstractmethod
    async def send_error(self, error: AError) -> None:
        """Send an error"""
        ...


# =====================================================
# MessageChannel — channel lifecycle protocol
#
# Each channel type (WebSocket/Teams) implements
# this protocol; ChannelManager handles unified start/stop.
# =====================================================

class MessageChannel(ABC):
    """Message channel lifecycle management"""

    @property
    @abstractmethod
    def channel_type(self) -> str:
        """Channel type identifier, e.g. 'websocket', 'teams'"""
        ...

    @abstractmethod
    async def start(self) -> None:
        """Start the channel"""
        ...

    @abstractmethod
    async def stop(self) -> None:
        """Stop the channel"""
        ...


# =====================================================
# PermissionStrategy — permission decision strategy
#
# WebSocket: interactive approval (popup waiting for user click)
# Non-interactive channels: auto-allow + tool allowlist
# =====================================================

class PermissionStrategy(ABC):
    """Pluggable tool permission decision strategy"""

    @abstractmethod
    async def request_permission(
        self,
        agent_id: str,
        tool_name: str,
        input_data: dict[str, Any],
        tool_use_id: str,
    ) -> PermissionResult:
        """Request permission to use a tool

        Args:
            agent_id: session ID
            tool_name: name of the tool
            input_data: tool input parameters
            tool_use_id: unique identifier of the tool_use block (used by the
                frontend to match a permission request to the exact tool call,
                so concurrent requests for the same tool name don't collide)

        Returns:
            PermissionResult: allow or deny
        """
        ...


# =====================================================
# AutoAllowPermissionStrategy — shared by non-interactive channels
#
# Used by API channel, Teams, Email — any channel where there is
# no user present to click "allow" on a permission prompt.
# Tools in the allowlist are automatically permitted; others denied.
# =====================================================

class AutoAllowPermissionStrategy(PermissionStrategy):
    """Auto-allow permission strategy for non-interactive channels"""

    DEFAULT_ALLOWED_TOOLS: Set[str] = {
        "Task",
        "TaskOutput",
        "Edit",
        "TodoWrite",
        "Read",
        "Bash",
        "KillShell",
        "Grep",
        "Glob",
        "LS",
        "Write",
        "Skill",
        "WebSearch",
        "WebFetch",
        "AskUserQuestion",
    }

    def __init__(self, allowed_tools: Optional[Set[str]] = None):
        self.allowed_tools = allowed_tools or self.DEFAULT_ALLOWED_TOOLS

    async def request_permission(
            self,
            agent_id: str,
            tool_name: str,
            input_data: dict[str, Any],
            tool_use_id: str,
    ) -> PermissionResult:
        if tool_name in self.allowed_tools:
            logger.debug(f"✅ Auto-allowed tool: {tool_name} (agent={agent_id})")
            return PermissionResultAllow(updated_input=input_data)

        logger.info(f"🚫 Auto-denied tool: {tool_name} (agent={agent_id})")
        return PermissionResultDeny(
            message=f"Tool '{tool_name}' is not allowed in this channel"
        )
