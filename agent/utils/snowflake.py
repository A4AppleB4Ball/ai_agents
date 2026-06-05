#!/usr/bin/env python
# -*- coding: UTF-8 -*-
# =====================================================
# @File   ：snowfake
# @Date   ：2021/10/19 9:37
# ------------      -------    --------    ------------
# 2021/10/19 9:37   Amit        1.0.0         Create

# =====================================================

import time
import random

from agent.utils.logger import logger


class InvalidSystemClock(Exception):
    """
    Clock rollback exception
    """
    pass


# 64-bit ID division
WORKER_ID_BITS = 5
DATACENTER_ID_BITS = 5
SEQUENCE_BITS = 12

# Maximum value calculation
MAX_WORKER_ID = -1 ^ (-1 << WORKER_ID_BITS)  # 2**5-1 0b11111
MAX_DATACENTER_ID = -1 ^ (-1 << DATACENTER_ID_BITS)

# Bit shift offset calculation
WOKER_ID_SHIFT = SEQUENCE_BITS
DATACENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS
TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS

# Sequence cycle mask
SEQUENCE_MASK = -1 ^ (-1 << SEQUENCE_BITS)

# Start timestamp (2015-01-01)
TWEPOCH = 1288834974657


class IdWorker(object):
    """
    Used for generating IDs
    """

    def __init__(self, datacenter_id, worker_id, sequence=0):
        """
        Initialize
        :param datacenter_id: Datacenter (machine region) ID
        :param worker_id: Worker machine ID
        :param sequence: Starting sequence number
        """
        # sanity check
        if worker_id > MAX_WORKER_ID or worker_id < 0:
            raise ValueError('worker_id value out of bounds')
        if datacenter_id > MAX_DATACENTER_ID or datacenter_id < 0:
            raise ValueError('datacenter_id value out of bounds')
        self.worker_id = worker_id
        self.datacenter_id = datacenter_id
        self.sequence = sequence
        self.last_timestamp = -1  # Last calculated timestamp

    def _gen_timestamp(self):
        """
        Generate integer timestamp
        :return:int timestamp
        """
        return int(time.time() * 1000)

    def get_id(self) -> str:
        """
        Get new ID
        :return:
        """
        timestamp = self._gen_timestamp()
        # Clock rollback
        if timestamp < self.last_timestamp:
            logger.warning(f"Clock rollback: last_timestamp={self.last_timestamp}, now_timestamp={timestamp}")
            return self.get_id()
        if timestamp == self.last_timestamp:
            self.sequence = (self.sequence + 1) & SEQUENCE_MASK
            if self.sequence == 0:
                timestamp = self._til_next_millis(self.last_timestamp)
        else:
            self.sequence = 0
        self.last_timestamp = timestamp
        new_id = ((timestamp - TWEPOCH) << TIMESTAMP_LEFT_SHIFT) | (self.datacenter_id << DATACENTER_ID_SHIFT) | \
                 (self.worker_id << WOKER_ID_SHIFT) | self.sequence
        return str(new_id)

    def _til_next_millis(self, last_timestamp):
        """
        Wait until next millisecond
        """
        timestamp = self._gen_timestamp()
        while timestamp <= last_timestamp:
            timestamp = self._gen_timestamp()
        return timestamp


worker = IdWorker(random.randint(0, 5), random.randint(0, 5), random.randint(0, 12))
