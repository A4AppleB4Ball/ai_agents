# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : websocket_server.py
# @Date   : 2025/11/28 15:27

# 2025/11/28 15:27   Create
# =====================================================

from fastapi import APIRouter, WebSocket

from agent.api.auth.dependencies import verify_token
from agent.core.config import _current_user_email, settings
from agent.service.websocket_handler import WebSocketHandler
from agent.utils.logger import logger

router = APIRouter()


@router.websocket("/chat/ws")
async def chat(websocket: WebSocket):
    """
    WebSocket endpoint for handling frontend connections

    Args:
        websocket: FastAPI WebSocket instance
    """
    logger.info("New WebSocket connection request")

    # Authenticate WebSocket connection via query parameter token
    if settings.DISABLE_AUTH:
        _current_user_email.set("dev@local")
    else:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4001, reason="Missing authentication token")
            return
        try:
            user = await verify_token(token)
            _current_user_email.set(user.email)
        except Exception as e:
            logger.error(f"WebSocket auth failed: {e}")
            await websocket.close(code=4001, reason="Authentication failed")
            return

    try:
        # Create independent WebSocketHandler instance for each connection
        handler = WebSocketHandler()
        await handler.handle_websocket_connection(websocket)
    except Exception as e:
        logger.error(f"WebSocket endpoint processing failed: {e}")
        # Ensure connection is closed
        try:
            await websocket.close(code=1011, reason=f"Server error: {str(e)}")
        except Exception as e:
            logger.error(f"WebSocket close failed: {e}")
            pass  # Connection may already be closed


# Export router
__all__ = ["router"]
