# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：redis_cache
# @Date   ：2025/11/12 17:58
#
# 2025/11/12 17:58   Create
# =====================================================

import json
from functools import lru_cache
from typing import Optional, Union

import redis
from redis.cluster import RedisCluster as RedisCluster

from agent.core.config import settings


class RedisCache:
    """Synchronous Redis cache wrapper class"""

    def __init__(
            self,
            redis_client: Union[redis.Redis, RedisCluster],
            expire: Optional[int] = None,
            prefix: Optional[str] = None
    ):
        """
        Initialize synchronous Redis cache

        Args:
            redis_client: Synchronous Redis client instance (required)
            expire: Default expiration time (seconds)
            prefix: Key prefix
        """
        self._client = redis_client

        self.expire = expire
        self.nx = False
        self.xx = False
        self.prefix = f"{settings.PROJECT_NAME}:algorithm:{prefix}" if prefix else f"{settings.PROJECT_NAME}:algorithm"


    @staticmethod
    def to_text(value, encoding="utf-8"):
        """Convert value to text"""
        if not value:
            return None
        if isinstance(value, str):
            return value
        if isinstance(value, bytes):
            return value.decode(encoding)
        return str(value)

    def key_name(self, key: str) -> str:
        """Generate key name with prefix"""
        if not self.prefix:
            return key
        if key.startswith(self.prefix):
            return key
        return f"{self.prefix}:{key}"

    def set(self, name: str, value: str, ex: Optional[int] = None) -> bool:
        """Set cache"""
        name = self.key_name(name)
        ex = ex or self.expire
        return self._client.set(name, value, ex=ex, nx=self.nx, xx=self.xx)

    def set_json(self, name: str, value: dict, ex: Optional[int] = None) -> bool:
        """Set JSON cache"""
        name = self.key_name(name)
        json_str = json.dumps(value, ensure_ascii=False)
        return self.set(name, json_str, ex=ex)

    def get(self, name: str) -> Optional[str]:
        """Get cache"""
        name = self.key_name(name)
        ret = self._client.get(name)
        return self.to_text(ret)

    def get_json(self, name: str) -> Optional[dict]:
        """Get JSON cache"""
        name = self.key_name(name)
        ret = self.get(name)
        if ret:
            try:
                return json.loads(ret)
            except json.JSONDecodeError:
                return None
        return None

    def hget(self, name: str, key: str) -> Optional[str]:
        """Get Hash field"""
        name = self.key_name(name)
        ret = self._client.hget(name, key)
        return self.to_text(ret)

    def hset(self, name: str, key: str, value: str) -> int:
        """Set Hash field"""
        name = self.key_name(name)
        return self._client.hset(name, key, value)

    def delete(self, *names: str) -> int:
        """Delete cache"""
        keys = [self.key_name(name) for name in names]
        return self._client.delete(*keys)

    def exists(self, name: str) -> bool:
        """Check if key exists"""
        name = self.key_name(name)
        result = self._client.exists(name)
        return result > 0

    def expire_key(self, name: str, seconds: int) -> bool:
        """Set key expiration time"""
        name = self.key_name(name)
        return self._client.expire(name, seconds)

    def ttl(self, name: str) -> int:
        """Get remaining expiration time of key"""
        name = self.key_name(name)
        return self._client.ttl(name)


@lru_cache()
def get_cache_instance(prefix: str=None) -> RedisCache:
    """Get cache manager instance.
    Args:
        prefix: Cache key prefix

    Returns:
        Cache manager instance
    """
    from agent.shared.database.get_redis import get_redis_client
    redis_client = get_redis_client()
    return RedisCache(redis_client, prefix=prefix)