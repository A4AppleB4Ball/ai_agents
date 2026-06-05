# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：cache.py
# @Date   ：2025/4/24 14:58

# 2025/4/24 14:58   Create
# =====================================================

import hashlib
import json
import os
import shutil
import time
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Optional

from agent.core.config import settings
from agent.utils.logger import logger
from agent.utils.utils import cache_path


class FileCache:
    def __init__(self, namespace: str = "default", default_ttl_days: int = settings.DEFAULT_CACHE_TTL_DAYS):
        """Initialize generic file cache manager.

        Args:
            namespace: Cache namespace (e.g. 'ocr_results', 'user_sessions')
            default_ttl_days: Default cache cleanup period (days)
        """
        self.namespace = namespace
        self.enable_cache = settings.ENABLE_CACHE

        # Create more specific cache base directory using namespace
        self.base_cache_dir = cache_path(settings.CACHE_FILE_DIR, f"namespace/{self.namespace}")
        self.cleanup_ttl = timedelta(days=default_ttl_days)
        self._last_cleanup_date: Optional[date] = None  # <-- Track last cleanup date

        # No longer force date-based subdirectories for storage, but still cleanup by date directory
        self._ensure_base_dir()
        self._cleanup_old_caches()  # Clean up old caches once at initialization

    def _ensure_base_dir(self) -> None:
        """Ensure base cache directory exists."""
        if not os.path.exists(self.base_cache_dir):
            try:
                os.makedirs(self.base_cache_dir, exist_ok=True)
            except OSError as e:
                logger.error(f"[FileCache:{self.namespace}] Failed to create cache directory: {self.base_cache_dir}, Error: {e}")

    def _get_cache_filepath(self, key: str) -> str:
        """Generate cache file path based on key."""
        # Use hash of key as filename to avoid special character issues
        key_hash = hashlib.md5(key.encode('utf-8')).hexdigest()
        # Put all cache files directly in base directory to simplify lookup
        return os.path.join(self.base_cache_dir, f"{key_hash}.json")

    def _check_and_run_cleanup(self) -> None:
        """Check if daily cleanup task needs to run."""
        if not self.enable_cache:
            return
        today = date.today()
        if self._last_cleanup_date != today:
            logger.info(f"[FileCache:{self.namespace}] Triggering daily cache cleanup task...")
            self._cleanup_old_caches()
            self._last_cleanup_date = today

    def _cleanup_old_caches(self) -> None:
        """Clean up expired cache files (based on file modification time)."""
        if not self.enable_cache or not os.path.exists(self.base_cache_dir):
            return

        now_ts = time.time()
        cutoff_ts = now_ts - self.cleanup_ttl.total_seconds()

        cleaned_count = 0
        try:
            for filename in os.listdir(self.base_cache_dir):
                if filename.endswith(".json"):
                    filepath = os.path.join(self.base_cache_dir, filename)
                    try:
                        # Check file's last modification time
                        file_mtime = os.path.getmtime(filepath)
                        if file_mtime < cutoff_ts:
                            os.remove(filepath)
                            cleaned_count += 1
                    except FileNotFoundError:
                        continue  # File may have been deleted during iteration
                    except Exception as e:
                        logger.warning(f"[FileCache:{self.namespace}] Error cleaning file {filepath}: {e}")
            if cleaned_count > 0:
                logger.info(
                    f"[FileCache:{self.namespace}] Cleaned {cleaned_count} old cache files older than {self.cleanup_ttl.days} days.")
        except Exception as e:
            logger.error(f"[FileCache:{self.namespace}] Error during cache cleanup: {e}")

    @staticmethod
    def generate_key(content: str) -> str:
        """Generate cache key based on parameters.

        Args:
            content: Value to cache

        Returns:
            Cache key (string)
        """

        return hashlib.md5(content.encode('utf-8')).hexdigest()

    @staticmethod
    def generate_key_from_file(file_path: str) -> str:
        """Generate cache key based on file path.

        Args:
            file_path: File path

        Returns:
            Cache key (string)
        """

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        md5_hash = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5_hash.update(chunk)

        return md5_hash.hexdigest()

    def set(self, key: str, value: Any, ttl: Optional[timedelta] = None) -> None:
        """Store key-value pair in cache with optional expiration time.

        Args:
            key: Cache key (string)
            value: Value to cache (any JSON serializable object)
            ttl: Expiration time (timedelta object). If None, never expires (unless deleted by cleanup task).
        """
        self._check_and_run_cleanup()  # <-- Add cleanup check

        filepath = self._get_cache_filepath(key)
        self._ensure_base_dir()  # Ensure directory exists

        expires_at = None
        if ttl:
            expires_at = (datetime.now(timezone.utc) + ttl).isoformat()

        cache_data = {
            'value': value,
            'expires_at': expires_at,  # Store ISO format UTC time string
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=4)  # indent for readability
            logger.debug(f"[FileCache:{self.namespace}] Saved cache: {key} -> {filepath}")
        except IOError as e:
            logger.error(f"[FileCache:{self.namespace}] Failed to write cache file: {filepath}, Error: {e}")
        except TypeError as e:
            logger.error(f"[FileCache:{self.namespace}] Cache value cannot be JSON serialized: key={key}, Error: {e}")

    def get(self, key: str) -> Optional[Any]:
        """Get cache value by key. Returns None if cache doesn't exist or has expired.

        Args:
            key: Cache key

        Returns:
            Cached value, or None if not found or expired
        """
        self._check_and_run_cleanup()  # <-- Add cleanup check

        if not self.enable_cache:
            return None

        filepath = self._get_cache_filepath(key)

        if not os.path.exists(filepath):
            return None

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                cache_data = json.load(f)

            expires_at_str = cache_data.get('expires_at')
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                # Ensure comparison uses timezone-aware current time
                if datetime.now(timezone.utc) > expires_at:
                    # Cache has expired, delete file and return None
                    try:
                        os.remove(filepath)
                        logger.debug(f"[FileCache:{self.namespace}] Deleted expired cache: {key}")
                    except OSError as e:
                        logger.warning(f"[FileCache:{self.namespace}] Failed to delete expired cache file: {filepath}, Error: {e}")
                    return None

            # logger.debug(f"[FileCache:{self.namespace}] Cache hit: {key}")
            return cache_data.get('value')

        except (json.JSONDecodeError, KeyError, TypeError, ValueError, FileNotFoundError) as e:
            logger.warning(f"[FileCache:{self.namespace}] Failed to read or parse cache file: {filepath}, Error: {e}. May need cleanup.")
            # If file has issues, try to delete it
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except OSError:
                pass  # Ignore deletion error
            return None
        except Exception as e:
            logger.error(f"[FileCache:{self.namespace}] Unknown error when getting cache: key={key}, Error: {e}")
            return None

    def delete(self, key: str) -> bool:
        """Delete specified cache key.

        Args:
            key: Cache key to delete

        Returns:
            True if successfully deleted or key doesn't exist; False if deletion failed.
        """
        # Note: Cleanup is not triggered on delete
        if not self.enable_cache:
            return True  # Cache not enabled, consider as successful deletion

        filepath = self._get_cache_filepath(key)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                logger.debug(f"[FileCache:{self.namespace}] Deleted cache: {key}")
                return True
            except OSError as e:
                logger.error(f"[FileCache:{self.namespace}] Failed to delete cache file: {filepath}, Error: {e}")
                return False
        return True  # File doesn't exist, also consider as successful deletion

    def clear_namespace(self) -> bool:
        """Clear all caches under current namespace."""
        # Note: Cleanup is not triggered on clear_namespace
        if not self.enable_cache:
            return True

        if os.path.exists(self.base_cache_dir):
            try:
                shutil.rmtree(self.base_cache_dir)
                logger.info(f"[FileCache:{self.namespace}] Cleared namespace cache directory: {self.base_cache_dir}")
                self._ensure_base_dir()  # Recreate base directory
                return True
            except OSError as e:
                logger.error(f"[FileCache:{self.namespace}] Failed to clear namespace cache: {self.base_cache_dir}, Error: {e}")
                return False
        return True  # Directory doesn't exist, consider as successful clearing


@lru_cache()
def get_cache_instance(namespace: str = "default",
                       default_ttl_days: int = settings.DEFAULT_CACHE_TTL_DAYS) -> FileCache:
    """Get cache manager instance.
    Args:
        namespace: Cache namespace (e.g. 'ocr_results', 'user_sessions')
        default_ttl_days: Default cache cleanup period (days)
    Returns:
        Cache manager instance
    """
    return FileCache(namespace=namespace, default_ttl_days=default_ttl_days)

# Example usage (can be placed in other locations or test files)
# if __name__ == '__main__':
#     # Assume settings.ENABLE_CACHE = True and settings.CACHE_FILE_DIR are configured
#     # settings.ENABLE_CACHE = True
#     # settings.CACHE_FILE_DIR = "./.cache"  # Example path
#
#     my_cache = FileCache(namespace="my_app_data")
#
#     # Set cache with a 1-hour TTL
#     my_cache.set("user:123:profile", {"name": "Alice", "email": "alice@example.com"}, ttl=timedelta(hours=1))
#
#     # Set permanent cache (or until removed by the cleanup task)
#     my_cache.set("app:config", {"theme": "dark", "language": "en"})
#
#     # Get cache
#     user_profile = my_cache.get("user:123:profile")
#     if user_profile:
#         print("Retrieved user config:", user_profile)
#     else:
#         print("User config cache not found or expired")
#
#     app_config = my_cache.get("app:config")
#     print("Retrieved app config:", app_config)
#
#     # Delete cache
#     my_cache.delete("user:123:profile")
#     print("User config after deletion:", my_cache.get("user:123:profile"))
#
#     # Clean up old cache (usually not needed manually; called during initialization)
#     # my_cache._cleanup_old_caches()
#
#     # Clear namespace
#     # my_cache.clear_namespace()
#     # print("App config after clearing namespace:", my_cache.get("app:config"))
