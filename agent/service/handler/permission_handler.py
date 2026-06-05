#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : permission_handler.py
# @Date   : 2025/12/06
#
# 2025/12/06   Create
# 2026/2/25    Refactored: extracted permission logic to InteractivePermissionStrategy
# =====================================================

"""
Permission response handler (WebSocket inbound message routing)

[INPUT]: depends on MessageSender/PermissionStrategy from channel.channel,
         depends on InteractivePermissionStrategy from channel.websocket_channel
[OUTPUT]: exposes PermissionHandler
[POS]: permission message router in the handler module, only responsible for receiving frontend permission_response and forwarding it to the strategy
[PROTOCOL]: update this header when making changes, then check CLAUDE.md
"""

from typing import Any, Dict

from agent.service.channel.channel import MessageSender, PermissionStrategy
from agent.service.channel.websocket_channel import InteractivePermissionStrategy
from agent.service.handler.base_handler import BaseHandler
from agent.utils.logger import logger


class PermissionHandler(BaseHandler):
    """Permission response handler"""

    def __init__(self, sender: MessageSender, permission_strategy: PermissionStrategy):
        super().__init__(sender)
        self.permission_strategy = permission_strategy

    async def handle_permission_response(self, message: Dict[str, Any]) -> None:
        """Process frontend permission responses and forward them to the permission strategy.

        Args:
            message: Permission response message.
        """
        # Only the interactive strategy needs to process frontend responses
        if isinstance(self.permission_strategy, InteractivePermissionStrategy):
            self.permission_strategy.handle_permission_response(message)
        else:
            logger.warning("⚠️ The current permission strategy does not support frontend permission responses")
