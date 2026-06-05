# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：router
# @Date   ：2024/1/22 23:22

# 2024/1/22 23:22   Create
# =====================================================

from fastapi import APIRouter, Depends

from agent.api.api import common_router
from agent.api.agent.api_agent import router as agent_router
from agent.api.api_runs import router as runs_router
from agent.api.auth.dependencies import get_current_user_from_request
from agent.api.auth.router import router as auth_router
from agent.api.auth.service_auth import verify_service_api_key
from agent.api.chat_ws.websocket_server import router as websocket_router
from agent.api.session.api_session import router as session_router
from agent.core.config import settings
from agent.service.agents.digital_kb.router import router as digital_kb_router
from agent.service.browser.router import router as browser_router
from agent.shared.server.common.base_depends import extract_request_id

api_router = APIRouter(dependencies=[Depends(extract_request_id)], prefix=settings.API_PREFIX)

# Include the common router (health check)
api_router.include_router(common_router)

# Include the auth router
api_router.include_router(auth_router, prefix="/v1")

# Include the websocket router (WS auth is handled inside the endpoint)
if settings.WEBSOCKET_ENABLED:
    api_router.include_router(websocket_router, prefix="/v1")

# Include the agent router (protected by auth dependency)
api_router.include_router(
    agent_router, prefix="/v1", dependencies=[Depends(get_current_user_from_request)]
)

# Include the session router (protected by auth dependency)
api_router.include_router(
    session_router, prefix="/v1", dependencies=[Depends(get_current_user_from_request)]
)

# Include the digital-kb router (protected by auth dependency)
api_router.include_router(
    digital_kb_router, prefix="/v1", dependencies=[Depends(get_current_user_from_request)]
)

# Include the browser service router (WS auth handled inside, REST protected by auth)
api_router.include_router(browser_router, prefix="/v1")

# Include the API runs router (protected by service API key)
api_router.include_router(
    runs_router, prefix="/v1", dependencies=[Depends(verify_service_api_key)]
)
