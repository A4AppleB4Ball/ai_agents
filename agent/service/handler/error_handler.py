#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : error_handler.py
# @Date   : 2025/12/06
#
# 2025/12/06   Create
# =====================================================

import traceback
from typing import Any, Dict

from agent.service.handler.base_handler import BaseHandler
from agent.utils.logger import logger


class ErrorHandler(BaseHandler):
    """Error handler"""

    async def handle_unknown_message_type(self, message: Dict[str, Any]) -> None:
        """
        Process unknown message types.

        Args:
            message: Original message.
        """

        agent_id = message.get("agent_id")
        msg_type = message.get("type")
        logger.warning(f"❓ Unknown message type: {msg_type}")
        error_response = self.create_error_response(
            error_type="unknown_message_type",
            message=f"Unknown message type: {msg_type}",
            session_id=agent_id,
            details={"original_message": message}
        )
        await self.send(error_response)

    async def handle_websocket_error(self, error: Exception) -> None:
        """Process WebSocket errors."""
        logger.error(f"❌ WebSocket error: {error}")
        traceback.print_exc()

        # Send error response
        error_response = self.create_error_response(
            error_type="websocket_error",
            message=str(error),
            session_id=None
        )
        await self.send(error_response)
