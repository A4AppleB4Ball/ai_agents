# !/usr/bin/python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：register_exception
# @Date   ：2024/1/22 16:14

# 2024/1/22 16:14   Create
# =====================================================

import json
import traceback
from typing import Union

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError, ValidationException
from pydantic_core import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from agent.utils.constants import TermColors
from agent.utils.logger import logger
from ..common.base_exception import *


async def log_error(
        request: Request,
        exc: Union[ServerException, ValidationError, ValidationException, StarletteHTTPException, Exception]
):
    """Log exception to logger"""

    if issubclass(exc.__class__, ValidationException):
        error_msg = exc.errors()
        response = UnProcessable
    elif issubclass(exc.__class__, ServerException):
        error_msg = exc.errors
        response = exc.resp
    elif issubclass(exc.__class__, ValidationError):
        error_msg = exc.errors()
        response = ServerError
    elif isinstance(exc, StarletteHTTPException):
        error_msg = exc.detail
        if exc.status_code == 401:
            response = Unauthorized
        elif exc.status_code == 403:
            response = FORBIDDEN
        elif exc.status_code == 404:
            response = NotFound
        else:
            response = ServerError
    else:
        error_msg = "[Internal Exception Error]" + str(exc)
        response = ServerError

    request_id = getattr(request.state, "request_id", "unknown")
    if request_id == "unknown":
        try:
            # Try to get from query parameters
            request_id = request.query_params.get("request_id", "unknown")

            # If still unknown, try to get from cached body (if available)
            if request_id == "unknown" and hasattr(request.state, "body"):
                body_data = json.loads(request.state.body)
                request_id = body_data.get("request_id", "unknown")
        except Exception:
            request_id = "unknown"

    response.detail = error_msg
    response.request_id = request_id

    logger.error(
        f"{TermColors.RED}Exception  : {error_msg}\n"
        f"====================ERROR======================\n"
        f"RequestId  : {request_id}\n"
        f"Host       : {request.client.host}\n"
        f"URL        : {request.method} {request.url}\n"
        f"UserAgent  : {request.headers.get('user-agent')}\n\n"
        f"{traceback.format_exc()}\n"
        f"===============================================\n{TermColors.RESET}"
    )

    return fail(response)


def register_exception(app: FastAPI) -> None:
    """
    Catch exceptions
    :param app:
    :return:
    """

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc: StarletteHTTPException):
        return await log_error(request, exc)

    @app.exception_handler(ValidationError)
    async def inner_validation_exception_handler(request: Request, exc: ResponseValidationError):
        """
        Internal parameter validation exception
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)

    @app.exception_handler(ResponseValidationError)
    async def inner_validation_exception_handler(request: Request, exc: ResponseValidationError):
        """
        Internal parameter validation exception
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
        """
        Request parameter validation exception
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)

    # Custom exception handlers
    @app.exception_handler(TokenExpiredException)
    async def user_token_expired_exception_handler(request: Request, exc: TokenExpiredException):
        """
        Token expired
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)

    @app.exception_handler(TokenAuthException)
    async def user_token_exception_handler(request: Request, exc: TokenAuthException):
        """
        User token exception
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)

    @app.exception_handler(AuthenticationException)
    async def user_not_found_exception_handler(request: Request, exc: AuthenticationException):
        """
        Insufficient user permissions
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)

    @app.exception_handler(ServerException)
    async def base_exception_handler(request: Request, exc: ServerException):
        """
        Server internal error
        :param request:
        :param exc:
        """
        return await log_error(request, exc)

    # Catch all exceptions
    @app.exception_handler(Exception)
    async def all_exception_handler(request: Request, exc: Exception):
        """
        Global all exceptions
        :param request:
        :param exc:
        :return:
        """
        return await log_error(request, exc)
