# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   : config
# @Date   : 2024/2/23 10:15

# 2024/2/23 10:15   Create
# =====================================================

import contextvars
import os
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict

from agent.shared.schemas.model_cython import CyFunctionDetector

ROOT_PATH = os.path.abspath(os.path.abspath(os.path.dirname(__file__)) + '/../')
if os.environ.get("ENV_FILE"):
    ENV_FILE = os.environ.get("ENV_FILE")
elif os.path.isfile(os.path.join(os.getcwd(), ".env")):
    ENV_FILE = os.path.join(os.getcwd(), ".env")
else:
    ENV_FILE = os.path.join(ROOT_PATH, "../.env")

# http://patorjk.com/software/taag/#p=display&f=Lil%20Devil&t=v%201.0.1%0A
logo = """
"""


class Settings(BaseSettings):
    # Project information, service configuration
    LOGO: str = logo
    WORKERS: int = os.getenv("WORKERS", 1)
    DEBUG: bool = True
    PROJECT_NAME: str = "agent"
    API_PREFIX: str = "/agent"
    ENABLE_SWAGGER_DOC: bool = True
    SERVER_TYPE: str = "uvicorn"

    HOST: str = "0.0.0.0"
    PORT: int = os.getenv("PORT", 8010)
    DOMAIN: str = f'http://localhost:{PORT}'

    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_NAME: str = "agent"
    LOG_PATH: str = os.path.abspath(os.path.join(os.getcwd(), "logs"))
    LOGGER_FORMAT: str = f"\033[97m[ \033[90m%(asctime)s \033[97m]\033[35m %(levelname)-7s \033[97m| \033[36m%(filename)s %(lineno)4d \033[97m - \033[32m%(message)s\033[97m"

    # CORS configuration
    BACKEND_CORS_ORIGINS: list = ["*"]

    # Permission configuration, set ACCESS_TOKEN value in .env file to enable authentication
    # Uses Access Token mode, requires Authorization header with Bearer prefix followed by Access Token
    # Token generation reference: openssl rand -hex 32
    ACCESS_TOKEN: Optional[str] = None

    # Cache configuration
    CACHE_FILE_DIR: str = os.path.abspath(os.path.join(os.getcwd(), "cache"))
    DEFAULT_CACHE_TTL_DAYS: int = 7

    # Anthropic / AI Gateway
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_BASE_URL: str = ""
    ANTHROPIC_CUSTOM_HEADERS: str = ""
    ANTHROPIC_MODEL: str = ""

    # =====================================================
    # Message channel configuration
    # =====================================================
    WEBSOCKET_ENABLED: bool = True

    TEAMS_ENABLED: bool = False
    TEAMS_APP_ID: str = ""
    TEAMS_APP_SECRET: str = ""
    TEAMS_TENANT_ID: str = ""

    # =====================================================
    # SSO / Authentication configuration
    # =====================================================
    SSO_TENANT_ID: str = ""
    SSO_CLIENT_ID: str = ""
    DISABLE_AUTH: bool = False
    DIGITAL_AI_AGENTS_SERVICE_API_TOKEN: str = ""

    # =====================================================
    # Browser service configuration
    # =====================================================
    BROWSER_HEADLESS: bool = True
    BROWSER_CHANNEL: str = ""
    BROWSER_MAX_SESSIONS: int = 5
    BROWSER_MAX_SESSIONS_PER_CHAT: int = 5
    BROWSER_SCREENCAST_FPS: int = 8
    BROWSER_SCREENCAST_QUALITY: int = 60
    BROWSER_SESSION_TIMEOUT: int = 600
    BROWSER_CHROMIUM_ARGS: str = "--no-sandbox,--disable-dev-shm-usage,--disable-gpu"
    BROWSER_INTERNAL_DOMAINS: str = ""

    # =====================================================
    # Workspace & data configuration
    # =====================================================
    WORKSPACE_PATH: str = ""  # Base for user workspaces. Default: <cwd>/data/workspace
    AGENTS_DATA_PATH: str = ""  # Agent definitions (skills, index). Default: <cwd>/data/agents

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(ENV_FILE),
        env_file_encoding="utf-8",
        extra="allow",
        case_sensitive=True,
        ignored_types=(CyFunctionDetector,)
    )

    def update_dependent_settings(self):
        if self.ANTHROPIC_API_KEY:
            os.environ["ANTHROPIC_API_KEY"] = self.ANTHROPIC_API_KEY
        if self.ANTHROPIC_BASE_URL:
            os.environ["ANTHROPIC_BASE_URL"] = self.ANTHROPIC_BASE_URL
        if self.ANTHROPIC_MODEL:
            os.environ["ANTHROPIC_MODEL"] = self.ANTHROPIC_MODEL
        if self.ANTHROPIC_CUSTOM_HEADERS:
            os.environ["ANTHROPIC_CUSTOM_HEADERS"] = self.ANTHROPIC_CUSTOM_HEADERS

        for key in ("CLAUDE_CODE_USE_BEDROCK", "AWS_PROFILE", "AWS_REGION"):
            value = getattr(self, key, None) or os.environ.get(key, "")
            if value:
                os.environ[key] = str(value)

        if os.environ.get("CACHE_FILE_DIR"):
            self.CACHE_FILE_DIR = os.path.abspath(os.environ.get("CACHE_FILE_DIR"))
        else:
            self.CACHE_FILE_DIR = os.path.abspath(self.CACHE_FILE_DIR)
        ...

    def status(self, logger):
        self.update_dependent_settings()
        logger.info("USE: " + self.__class__.__name__)
        for attr in dir(self):
            if attr in ["model_computed_fields", "model_fields"]:
                continue
            if not attr.startswith("__") and \
                    not callable(getattr(self, attr)) and \
                    attr not in ["LOGO", "SECRET_KEY", "_abc_impl"] and \
                    not attr.startswith("model_"):
                logger.info(f"{attr}: {getattr(self, attr)}")
        for attr in self.model_extra:
            logger.info(f"{attr}: {getattr(self, attr)}")

    def __str__(self):
        text = "\n".join(
            [
                attr + ": " + str(getattr(self, attr))
                for attr in dir(self)
                if not attr.startswith("__") and
                not callable(getattr(self, attr)) and
                attr not in ["LOGO", "SECRET_KEY"]
            ]
        )
        return "\n" + text

    def __repr__(self):
        return self.__str__()


settings = Settings()

_current_user_email: contextvars.ContextVar[str] = contextvars.ContextVar(
    "_current_user_email", default="anonymous"
)


def get_current_user() -> str:
    """Return the current authenticated user identifier (username portion of email).

    Uses the ContextVar set by the auth dependency per-request.
    Falls back to 'anonymous' if not set.
    """
    email = _current_user_email.get()
    if "@" in email:
        return email.split("@")[0]
    return email


def get_workspace_base_path() -> str:
    """Resolved workspace base path (root for all users).

    Resolution: WORKSPACE_PATH env → <cwd>/data/workspace
    """
    if settings.WORKSPACE_PATH:
        return os.path.abspath(settings.WORKSPACE_PATH)
    return os.path.abspath(os.path.join(os.getcwd(), "data", "workspace"))


def get_user_workspace_path() -> str:
    """Resolved workspace path for the current user.

    Structure: <WORKSPACE_PATH>/<user>/
    """
    return os.path.join(get_workspace_base_path(), get_current_user())


def get_agents_data_path() -> str:
    """Resolved agents data path (agent definitions, skills, index).

    Resolution: AGENTS_DATA_PATH env → <cwd>/data/agents
    """
    if settings.AGENTS_DATA_PATH:
        return os.path.abspath(settings.AGENTS_DATA_PATH)
    return os.path.abspath(os.path.join(os.getcwd(), "data", "agents"))
