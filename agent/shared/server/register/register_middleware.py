# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：register_middleware
# @Date   ：2024/1/22 16:16

# 2024/1/22 16:16   Create
# =====================================================

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from agent.shared.server.common.base_exception import Unauthorized
from agent.core.config import settings
from agent.utils.logger import logger


def register_middleware(app: FastAPI) -> None:
    """
    Support cross-origin resource sharing
    :param app:
    :return:
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin) for origin in settings.BACKEND_CORS_ORIGINS
        ],  # Set allowed origins
        allow_credentials=True,
        # Set allowed cross-origin HTTP methods, such as get, post, put, etc.
        allow_methods=["*"],
        # Allowed cross-origin headers, can be used for identifying sources, etc.
        allow_headers=["*"]
    )

    # Register authentication middleware
    if settings.ACCESS_TOKEN:
        @app.middleware("http")
        async def authentication(request: Request, call_next):
            if request.method == "OPTIONS":
                return await call_next(request)
            url_path = request.url.path
            if not url_path.startswith(settings.API_PREFIX):
                return await call_next(request)
            authorization = request.headers.get("Authorization")
            if not authorization:
                response_data = Unauthorized
                response_data.code = str(401)
                response_data.message = "Authorization header is missing"
                logger.error("Authorization header is missing")
                return JSONResponse(content=jsonable_encoder(response_data.resp_dict), status_code=401)
            if authorization != "Bearer " + settings.ACCESS_TOKEN:
                response_data = Unauthorized
                response_data.code = str(401)
                response_data.message = "Token is invalid"
                logger.error(f"Token is invalid: {authorization}")
                return JSONResponse(content=jsonable_encoder(response_data.resp_dict), status_code=403)
            return await call_next(request)
