# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：__init__.py
# @Date   ：2026/2/25 15:45
#
# 2026/2/25 15:45   Create
# =====================================================

"""
Message channel abstraction layer

[OUTPUT]: Exposes MessageSender/MessageChannel/PermissionStrategy protocols,
          ChannelManager, and WebSocket/Teams/API channel implementations
[POS]: Module entry point for agent/service/channel; consumed by the handler layer and app.py
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

from agent.service.channel.channel import (
    AutoAllowPermissionStrategy,
    MessageChannel,
    MessageSender,
    PermissionStrategy,
)
from agent.service.channel.channel_manager import ChannelManager
from agent.service.channel.api_channel import ApiChannel, api_channel

__all__ = [
    "AutoAllowPermissionStrategy",
    "MessageSender",
    "MessageChannel",
    "PermissionStrategy",
    "ChannelManager",
    "ApiChannel",
    "api_channel",
]
