# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : server
# @Date   : 2024/2/23 09:55

# 2024/2/23 09:55   Create
# =====================================================

import gc
from contextlib import asynccontextmanager

from fastapi import FastAPI

from agent.api.router import api_router
from agent.core.config import settings
from agent.service.channel.api_channel import api_channel
from agent.service.channel.channel_manager import ChannelManager
from agent.shared.server.register import register_exception, register_hook, register_middleware
from agent.utils.logger import logger

# Global channel manager
channel_manager = ChannelManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info("📁 Starting with workspace file storage mode")

        # Register and start message channels
        await _register_channels()

        gc.collect()
        gc.freeze()

        yield

    finally:
        await channel_manager.stop_all()
        logger.info("Model shutdown complete.")


async def _register_channels() -> None:
    """Register message channels based on configuration"""
    channel_manager.register(api_channel)

    await channel_manager.start_all()



def create_app() -> FastAPI:
    # Standardize mcp_apps parameter handling to ensure it's in list format

    app = FastAPI(
        debug=settings.DEBUG,
        title=settings.PROJECT_NAME,
        lifespan=lifespan,
        openapi_url=f"/openapi.json" if settings.ENABLE_SWAGGER_DOC else None,
        docs_url=f"/docs" if settings.ENABLE_SWAGGER_DOC else None,
        redoc_url=f"/redoc" if settings.ENABLE_SWAGGER_DOC else None,
        routes=api_router.routes,

    )

    # Register middleware
    register_middleware(app)

    # Register global exception handler
    register_exception(app)

    # Request interceptor
    register_hook(app)

    return app


app = create_app()
