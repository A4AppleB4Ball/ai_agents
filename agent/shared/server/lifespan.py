# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：lifespan
# @Date   ：2025/9/26 23:49

# 2025/9/26 23:49   Create
# =====================================================


from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI
from fastmcp.server.http import StarletteWithLifespan

from agent.utils.logger import logger


@asynccontextmanager
async def multi_lifespan_manager(apps: List[StarletteWithLifespan], app: FastAPI):
    """Manage lifespan of multiple MCP applications"""
    # Create generators for all lifespans
    lifespan_managers = []
    try:
        # Start lifespans for all MCP applications
        for app_item in apps:
            manager = app_item.lifespan(app)
            await manager.__aenter__()
            lifespan_managers.append(manager)

        yield
    finally:
        # Close lifespans for all MCP applications in reverse order
        for manager in reversed(lifespan_managers):
            try:
                await manager.__aexit__(None, None, None)
            except Exception as e:
                logger.error(f"Error closing MCP lifespan: {e}")