#!/usr/bin/env python
# -*- coding: UTF-8 -*-
# =====================================================
# @Project：algorithm
# @File   ：database_redis
# @Date   ：2020/11/25 19:07
# ------------      -------    --------    ------------
# 2020/11/25 19:07   Amit        1.0.0         Create

# =====================================================

from functools import lru_cache
from typing import Optional, Union

import redis
from redis import asyncio as aioredis
from redis.asyncio.cluster import RedisCluster as AioRedisCluster
from redis.cluster import ClusterNode, RedisCluster

from agent.core.config import settings


@lru_cache(maxsize=32)
def get_redis_client(
        host: Optional[str] = None,
        port: Optional[int] = None,
        password: Optional[str] = None,
        db: Optional[int] = None,
        decode_responses: bool = True,
        cluster_enabled: Optional[bool] = None,
        cluster_nodes: Optional[str] = None,
        use_pool: Optional[bool] = None,
        max_connections: Optional[int] = None,
        socket_timeout: Optional[int] = None,
        socket_connect_timeout: Optional[int] = None,
        socket_keepalive: Optional[bool] = None
) -> Union[redis.Redis, RedisCluster]:
    """
    Get synchronous Redis client (standalone or cluster)

    Args:
        host: Redis host address, defaults to settings.REDIS_HOST
        port: Redis port, defaults to settings.REDIS_PORT
        password: Redis password, defaults to settings.REDIS_PASSWD
        db: Database index, defaults to settings.REDIS_DB
        decode_responses: Whether to automatically decode responses to strings, default False
        cluster_enabled: Whether to enable cluster mode, defaults to settings.REDIS_CLUSTER_ENABLED
        cluster_nodes: Cluster nodes, format "host1:port1,host2:port2", defaults to settings.REDIS_CLUSTER_NODES
        use_pool: Whether to use connection pool, defaults to settings.REDIS_POOL
        max_connections: Maximum connections in pool, defaults to settings.REDIS_MAX_CONNECTIONS
        socket_timeout: Socket timeout (seconds), defaults to settings.REDIS_SOCKET_TIMEOUT
        socket_connect_timeout: Connection timeout (seconds), defaults to settings.REDIS_SOCKET_CONNECT_TIMEOUT
        socket_keepalive: Whether to keep connection alive, defaults to settings.REDIS_SOCKET_KEEPALIVE

    Returns:
        Synchronous Redis client instance (redis.Redis or RedisCluster)
    """

    # Use provided parameters or default config
    host = host or settings.REDIS_HOST  # noqa
    port = port or settings.REDIS_PORT
    password = password or settings.REDIS_PASSWD
    db = db if db is not None else settings.REDIS_DB
    cluster_enabled = cluster_enabled if cluster_enabled is not None else settings.REDIS_CLUSTER_ENABLED
    cluster_nodes = cluster_nodes or settings.REDIS_CLUSTER_NODES
    use_pool = use_pool if use_pool is not None else settings.REDIS_POOL
    max_connections = max_connections or settings.REDIS_MAX_CONNECTIONS
    socket_timeout = socket_timeout or settings.REDIS_SOCKET_TIMEOUT
    socket_connect_timeout = socket_connect_timeout or settings.REDIS_SOCKET_CONNECT_TIMEOUT
    socket_keepalive = socket_keepalive if socket_keepalive is not None else settings.REDIS_SOCKET_KEEPALIVE

    # Cluster mode
    if cluster_enabled and cluster_nodes:
        # Parse cluster nodes
        nodes = []
        for node in cluster_nodes.split(','):
            node_host, node_port = node.strip().split(':')
            nodes.append(ClusterNode(host=node_host, port=int(node_port)))

        client = RedisCluster(
            startup_nodes=nodes,
            password=password if password else None,
            decode_responses=decode_responses,
            max_connections=max_connections,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout
        )

        return client

    # Standalone mode
    if use_pool:  # noqa
        # Connection pool mode

        pool = redis.ConnectionPool(
            host=host,
            port=port,
            password=password if password else None,
            db=db,
            encoding="utf-8",
            decode_responses=decode_responses,
            max_connections=max_connections,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout,
            socket_keepalive=socket_keepalive
        )
        client = redis.Redis.from_pool(connection_pool=pool)
    else:
        # Direct connection
        client = redis.Redis(
            host=host,
            port=port,
            password=password if password else None,
            db=db,
            encoding="utf-8",
            decode_responses=decode_responses,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout
        )

    return client


@lru_cache(maxsize=32)
def get_aioredis_client(
        host: Optional[str] = None,
        port: Optional[int] = None,
        password: Optional[str] = None,
        db: Optional[int] = None,
        decode_responses: bool = True,
        cluster_enabled: Optional[bool] = None,
        cluster_nodes: Optional[str] = None,
        use_pool: Optional[bool] = None,
        max_connections: Optional[int] = None,
        socket_timeout: Optional[int] = None,
        socket_connect_timeout: Optional[int] = None,
        socket_keepalive: Optional[bool] = None
) -> Union[aioredis.Redis, AioRedisCluster]:
    """
    Get Redis client (standalone or cluster)

    Args:
        host: Redis host address, defaults to settings.REDIS_HOST
        port: Redis port, defaults to settings.REDIS_PORT
        password: Redis password, defaults to settings.REDIS_PASSWD
        db: Database index, defaults to settings.REDIS_DB
        decode_responses: Whether to automatically decode responses to strings, default False
        cluster_enabled: Whether to enable cluster mode, defaults to settings.REDIS_CLUSTER_ENABLED
        cluster_nodes: Cluster nodes, format "host1:port1,host2:port2", defaults to settings.REDIS_CLUSTER_NODES
        use_pool: Whether to use connection pool, defaults to settings.REDIS_POOL
        max_connections: Maximum connections in pool, defaults to settings.REDIS_MAX_CONNECTIONS
        socket_timeout: Socket timeout (seconds), defaults to settings.REDIS_SOCKET_TIMEOUT
        socket_connect_timeout: Connection timeout (seconds), defaults to settings.REDIS_SOCKET_CONNECT_TIMEOUT
        socket_keepalive: Whether to keep connection alive, defaults to settings.REDIS_SOCKET_KEEPALIVE

    Returns:
        Redis client instance (aioredis.Redis or RedisCluster)
    """

    # Use provided parameters or default config
    host = host or settings.REDIS_HOST
    port = port or settings.REDIS_PORT
    password = password or settings.REDIS_PASSWD
    db = db if db is not None else settings.REDIS_DB
    cluster_enabled = cluster_enabled if cluster_enabled is not None else settings.REDIS_CLUSTER_ENABLED
    cluster_nodes = cluster_nodes or settings.REDIS_CLUSTER_NODES
    use_pool = use_pool if use_pool is not None else settings.REDIS_POOL
    max_connections = max_connections or settings.REDIS_MAX_CONNECTIONS
    socket_timeout = socket_timeout or settings.REDIS_SOCKET_TIMEOUT
    socket_connect_timeout = socket_connect_timeout or settings.REDIS_SOCKET_CONNECT_TIMEOUT
    socket_keepalive = socket_keepalive if socket_keepalive is not None else settings.REDIS_SOCKET_KEEPALIVE

    # Cluster mode
    if cluster_enabled and cluster_nodes:
        # Parse cluster nodes
        nodes = []
        for node in cluster_nodes.split(','):
            node_host, node_port = node.strip().split(':')
            nodes.append({"host": node_host, "port": int(node_port)})

        aioredis_client = AioRedisCluster(
            startup_nodes=nodes,
            password=password if password else None,
            decode_responses=decode_responses,
            max_connections=max_connections,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout
        )
        return aioredis_client

    if use_pool:  # noqa
        # Connection pool mode
        pool = aioredis.ConnectionPool(
            host=host,
            port=port,
            password=password if password else None,
            db=db,
            encoding="utf-8",
            decode_responses=decode_responses,
            max_connections=max_connections,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout,
            socket_keepalive=socket_keepalive
        )
        client = aioredis.Redis.from_pool(connection_pool=pool)
    else:
        # Direct connection
        client = aioredis.Redis(
            host=host,
            port=port,
            password=password if password else None,
            db=db,
            encoding="utf-8",
            decode_responses=decode_responses,
            socket_timeout=socket_timeout,
            socket_connect_timeout=socket_connect_timeout
        )

    return client
