# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : cli
# @Date   : 2025/6/18 15:00
# 2025/6/18 15:00   Create
# =====================================================

import warnings

warnings.filterwarnings("ignore", category=RuntimeWarning)

import signal
import sys
import os
from typing import Annotated, Optional, Set

import typer

from agent.core.config import settings
from agent.utils import utils
from agent.utils.logger import logger

client = typer.Typer(rich_markup_mode="rich")
VALID_CHANNELS = {"ws", "teams"}


def _normalize_channels(channels: Optional[list[str]]) -> Optional[Set[str]]:
    """Normalize channel parameters, supports duplicate parameters and comma separation."""
    if not channels:
        return None

    normalized: Set[str] = set()
    for raw_value in channels:
        for part in raw_value.split(","):
            channel = part.strip().lower()
            if not channel:
                continue
            if channel not in VALID_CHANNELS:
                raise typer.BadParameter(
                    f"Invalid channel: {channel}. Supported channels: ws, teams"
                )
            normalized.add(channel)

    if not normalized:
        raise typer.BadParameter("At least one channel must be specified")
    return normalized


def _set_bool_env(key: str, value: bool) -> None:
    """Write boolean environment variable to ensure subprocess configuration consistency."""
    os.environ[key] = "true" if value else "false"


def _apply_channel_overrides(
        selected_channels: Optional[Set[str]],
        teams_app_id: Optional[str],
        teams_app_secret: Optional[str],
        teams_tenant_id: Optional[str],
) -> None:
    """Override runtime settings with CLI parameters."""
    if selected_channels is not None:
        settings.WEBSOCKET_ENABLED = "ws" in selected_channels
        settings.TEAMS_ENABLED = "teams" in selected_channels

        _set_bool_env("WEBSOCKET_ENABLED", settings.WEBSOCKET_ENABLED)
        _set_bool_env("TEAMS_ENABLED", settings.TEAMS_ENABLED)

        logger.info(
            "🔧 CLI channel override: "
            f"ws={settings.WEBSOCKET_ENABLED}, "
            f"teams={settings.TEAMS_ENABLED}"
        )

    if teams_app_id is not None:
        settings.TEAMS_APP_ID = teams_app_id
        os.environ["TEAMS_APP_ID"] = teams_app_id
    if teams_app_secret is not None:
        settings.TEAMS_APP_SECRET = teams_app_secret
        os.environ["TEAMS_APP_SECRET"] = teams_app_secret
    if teams_tenant_id is not None:
        settings.TEAMS_TENANT_ID = teams_tenant_id
        os.environ["TEAMS_TENANT_ID"] = teams_tenant_id


async def run_server(**uvicorn_kwargs) -> None:
    from agent.shared.server.launcher import serve_http

    # workaround to avoid footguns where uvicorn drops requests with too
    # many concurrent requests active
    if settings.ENABLE_VLLM:
        from vllm.utils.system_utils import set_ulimit
        set_ulimit()

    def signal_handler(*_) -> None:
        # Interrupt server on sigterm while initializing
        raise KeyboardInterrupt("terminated")

    signal.signal(signal.SIGTERM, signal_handler)

    signal.signal(signal.SIGTERM, signal_handler)
    shutdown_task = await serve_http(**uvicorn_kwargs)

    # NB: Await server shutdown only after the backend context is exited
    await shutdown_task


@client.command(context_settings={"allow_extra_args": True, "ignore_unknown_options": True})
def run(
        server_type: Annotated[
            Optional[str],
            typer.Option(
                "--server-type",
                "-t",
                help="The server type to run the app. Options: gunicorn or uvicorn. Default: uvicorn."
            )
        ] = None,
        channels: Annotated[
            Optional[list[str]],
            typer.Option(
                "--channel",
                "-c",
                help="Enable channels, can be passed multiple times or comma-separated. Supported: ws, teams",
            ),
        ] = None,
        teams_app_id: Annotated[
            Optional[str],
            typer.Option("--teams-app-id", help="Microsoft Teams App ID"),
        ] = None,
        teams_app_secret: Annotated[
            Optional[str],
            typer.Option("--teams-app-secret", help="Microsoft Teams App Secret"),
        ] = None,
        teams_tenant_id: Annotated[
            Optional[str],
            typer.Option("--teams-tenant-id", help="Microsoft Teams Tenant ID"),
        ] = None,
):
    """
    Agent-Kit CLI - The [bold]Agent-Kit[/bold] command line app. 😎

    Run a [bold]FastAPI[/bold] app in [green]production[/green] mode. 🚀
    """

    selected_channels = _normalize_channels(channels)
    _apply_channel_overrides(
        selected_channels=selected_channels,
        teams_app_id=teams_app_id,
        teams_app_secret=teams_app_secret,
        teams_tenant_id=teams_tenant_id,
    )

    resolved_server_type = (server_type or settings.SERVER_TYPE or "uvicorn").lower()

    # Print config info
    utils.print_info(settings, logger)

    if resolved_server_type not in ["uvicorn", "gunicorn"]:
        typer.echo(f"Invalid server type: {resolved_server_type}. Options are [uvicorn] or [gunicorn].")
        return

    if resolved_server_type == "uvicorn":
        from agent.app import app
        kwargs = {
            "app": app,
            "host": settings.HOST,
            "port": settings.PORT,
            "reload": False if settings.WORKERS != 1 else settings.DEBUG,
            "workers": settings.WORKERS,
            "lifespan": 'on',
            "ws": "websockets-sansio",
            "log_config": utils.set_uvicorn_logger(settings.LOGGER_FORMAT)
        }
        import uvloop
        uvloop.run(run_server(**kwargs))
    elif resolved_server_type == "gunicorn":
        from gunicorn.app.wsgiapp import WSGIApplication

        sys.argv = [
            'gunicorn',  # Program name
            'agent.app:app',  # Application module
            '-c',  # Config file parameter
            utils.abspath('core/config_gunicorn.py')  # Config file path
        ]

        WSGIApplication("%(prog)s [OPTIONS] [APP_MODULE]", prog=None).run()


def main() -> None:
    client()
