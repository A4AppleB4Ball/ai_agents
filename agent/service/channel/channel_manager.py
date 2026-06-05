# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：channel_manager.py
# @Date   ：2026/2/25 15:45
#
# 2026/2/25 15:45   Create
# =====================================================

"""
Channel manager

[INPUT]: depends on agent.service.channel.channel for the MessageChannel protocol
[OUTPUT]: Exposes the ChannelManager singleton
[POS]: Orchestration layer for the channel module; manages the lifecycle of all channels
       via the app.py lifespan handler
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

from typing import Dict, List

from agent.service.channel.channel import MessageChannel
from agent.utils.logger import logger


class ChannelManager:
    """Channel registration and lifecycle management"""

    def __init__(self):
        self._channels: Dict[str, MessageChannel] = {}

    def register(self, channel: MessageChannel) -> None:
        """Register a channel"""
        if channel.channel_type in self._channels:
            logger.warning(f"⚠️ Channel already exists, overwriting: {channel.channel_type}")
        self._channels[channel.channel_type] = channel
        logger.info(f"📡 Channel registered: {channel.channel_type}")

    async def start_all(self) -> None:
        """Start all registered channels"""
        for channel_type, channel in self._channels.items():
            try:
                await channel.start()
                logger.info(f"✅ Channel started: {channel_type}")
            except Exception as e:
                logger.error(f"❌ Channel failed to start: {channel_type}, error={e}")

    async def stop_all(self) -> None:
        """Stop all registered channels"""
        for channel_type, channel in self._channels.items():
            try:
                await channel.stop()
                logger.info(f"🛑 Channel stopped: {channel_type}")
            except Exception as e:
                logger.error(f"❌ Channel failed to stop: {channel_type}, error={e}")

    def get(self, channel_type: str) -> MessageChannel:
        """Get the channel for the specified type"""
        return self._channels.get(channel_type)

    @property
    def active_channels(self) -> List[str]:
        """Return the list of registered channel types"""
        return list(self._channels.keys())
