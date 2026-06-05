"""
Microsoft Teams channel implementation (stub)

[INPUT]: depends on MessageChannel/AutoAllowPermissionStrategy from channel.py
[OUTPUT]: Exposes TeamsChannel
[POS]: Teams implementation for the channel module; functionality is a future prospect
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

from typing import Any

from agent.service.channel.channel import AutoAllowPermissionStrategy, MessageChannel
from agent.utils.logger import logger


class TeamsChannel(MessageChannel):
    """Microsoft Teams channel — future implementation"""

    def __init__(self, **kwargs: Any):
        pass

    @property
    def channel_type(self) -> str:
        return "teams"

    async def start(self) -> None:
        logger.info("📡 Teams channel is not yet implemented")

    async def stop(self) -> None:
        logger.info("🛑 Teams channel stopped")
