# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：logger
# @Date   ：2024/1/22 23:27

# 2024/1/22 23:27   Create
# =====================================================

import logging
import os
import re
import sys
import time
from logging import handlers
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from typing import Optional

from agent.core.config import settings
from agent.utils.utils import abspath, ROOT_PATH


def remove_ansi_escape(text):
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)


class Formatter(logging.Formatter):
    def __init__(self, fmt, **kwargs):
        super().__init__(fmt, **kwargs)
        self.base_dir = ROOT_PATH

    def format(self, record):
        # Calculate path relative to specified root directory
        record.filename = os.path.relpath(record.pathname, self.base_dir).replace(os.sep, ".")
        return super().format(record)


def setup_logger(
        name: str,
        save: Optional[bool] = False,
        filename: Optional[str] = None,
        mode: str = 'a',
        distributed_rank: bool = False,
        stdout: bool = True,
        socket: bool = False,
        rotating_size: bool = False,
        rotating_time: bool = False,
        level: str = 'debug',
        backupCount: int = 10

):
    """
    Logging module

    :param level: Log level
    :param name: Logger name
    :param filename: Log file name
    :param mode: Write mode
    :param distributed_rank: Whether distributed
    :param stdout: Whether to output to terminal
    :param save: Whether to save log file
    :param socket: Whether to output to socket
    :param rotating_size: Whether to rotate by file size
    :param rotating_time: Whether to rotate by date
    :param backupCount: Number of log files to retain
    :return:
    """

    if name in logging.Logger.manager.loggerDict.keys():
        return logging.getLogger(name)

    logger = logging.getLogger(name)
    level = level.upper()
    logger.setLevel(level)
    logger.propagate = False
    if distributed_rank:
        return logger

    formatter = Formatter(settings.LOGGER_FORMAT, datefmt="%Y-%m-%d %H:%M:%S")
    writer_formatter = Formatter(remove_ansi_escape(settings.LOGGER_FORMAT), datefmt="%Y-%m-%d %H:%M:%S")

    if stdout:
        ch = logging.StreamHandler(stream=sys.stdout)
        ch.setLevel(level)
        ch.setFormatter(formatter)
        logger.addHandler(ch)

    if socket:
        socketHandler = handlers.SocketHandler('localhost', logging.handlers.DEFAULT_TCP_LOGGING_PORT)
        socketHandler.setLevel(level)
        socketHandler.setFormatter(formatter)
        logger.addHandler(socketHandler)

    if save or filename:
        if filename is None:
            filename = time.strftime("%Y-%m-%d_%H.%M.%S", time.localtime()) + ".log"

        if not os.path.exists(os.path.dirname(filename)):
            os.makedirs(os.path.dirname(filename), exist_ok=True)

        if rotating_time:
            # Rotate every 1(interval) day(when), keep 7(backupCount) old files; when can also be Y/m/H/M/S
            th = TimedRotatingFileHandler(filename, when='D', interval=1, backupCount=backupCount, encoding="UTF-8")
            th.setLevel(level)
            th.setFormatter(writer_formatter)
            logger.addHandler(th)

        elif rotating_size:
            # Rotate every 1024 Bytes, keep 2(backupCount) old files
            sh = RotatingFileHandler(filename, mode=mode, maxBytes=1024 * 1024, backupCount=backupCount,
                                     encoding="UTF-8")
            sh.setLevel(level)
            sh.setFormatter(writer_formatter)
            logger.addHandler(sh)

        else:
            fh = logging.FileHandler(filename, mode=mode, encoding="UTF-8")
            fh.setLevel(level)
            fh.setFormatter(writer_formatter)
            logger.addHandler(fh)

    return logger


def cleanup_container_folders(base_path: str, hostname: str, max_days: int = 7):
    """
    Clean up old container log directories:
    1. Match directories with container ID format
    2. Exclude current container directory
    3. Delete directories where newest log file hasn't been updated for specified days

    Args:
        base_path: Base path, e.g., logs directory
        hostname: Current container's hostname, this directory will be kept
        max_days: Log retention days, default 7 days
    """
    import re
    import shutil
    from datetime import datetime, timedelta

    # Match 12-digit hexadecimal string (standard Docker container ID format)
    container_pattern = re.compile(r'^[0-9a-f]{12}$')
    # Current time
    now = datetime.now()
    # Maximum retention time
    max_delta = timedelta(days=max_days)

    def get_latest_file_time(dir_path: str) -> datetime:
        """Get the modification time of the newest file in directory"""
        latest_time = datetime.fromtimestamp(0)  # Initialize to earliest time

        for root, _, files in os.walk(dir_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    latest_time = max(latest_time, mtime)
                except Exception:
                    continue

        return latest_time

    try:
        if not os.path.exists(base_path):
            return

        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)

            # Skip non-directories and current container directory
            if not os.path.isdir(item_path) or item == hostname:
                continue

            # Check if it's container ID format
            if not container_pattern.match(item):
                continue

            # Get the modification time of the newest file in directory
            latest_time = get_latest_file_time(item_path)
            time_delta = now - latest_time

            # Delete if not updated for more than specified days
            if time_delta > max_delta:
                try:
                    shutil.rmtree(item_path)
                    print(f"Removed old container log directory: {item_path} "
                          f"(last modified: {latest_time.strftime('%Y-%m-%d %H:%M:%S')})")
                except Exception as e:
                    print(f"Failed to remove container folder {item_path}: {e}")

    except Exception as e:
        print(f"Error during container folders cleanup: {e}")


# Clean up old log files
# _, hostname = get_host_ip()
# cleanup_container_folders(abspath(settings.LOG_PATH), hostname, max_days=7)
logger = setup_logger(
    name=settings.PROJECT_NAME,
    filename=abspath(f"{settings.LOG_PATH}/logger.log"),
    stdout=True,
    level=settings.LOG_LEVEL,
    rotating_time=True,
    backupCount=7,
)
