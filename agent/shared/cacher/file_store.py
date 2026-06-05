# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：file_store
# @Date   ：2025/12/11 18:35

# 2025/12/11 18:35   Create
# Temporary file manager
# =====================================================

import json
import os
import shutil
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

from agent.core.config import settings
from agent.utils.logger import logger
from agent.utils.snowflake import worker
from agent.utils.utils import cache_path


class TempFile:
    """Temporary file manager for managing files with lifecycle."""

    def __init__(self, namespace: str = "default", default_ttl_hours: int = 6):
        """Initialize temporary file manager.

        Args:
            namespace: Namespace to isolate temporary files for different businesses
            default_ttl_hours: Default expiration time (hours)
        """
        self.namespace = namespace

        # Temporary file storage directory
        self.temp_dir = cache_path(settings.CACHE_FILE_DIR, f"temp/{self.namespace}")
        self.default_ttl = timedelta(hours=default_ttl_hours)
        self._last_cleanup_time: Optional[datetime] = None  # <-- Track last cleanup time

        self._ensure_temp_dir()
        self.cleanup_expired()  # Clean up old cache once at initialization

    def _ensure_temp_dir(self) -> None:
        """Ensure temporary file directory exists."""
        if not os.path.exists(self.temp_dir):
            try:
                os.makedirs(self.temp_dir, exist_ok=True)
                logger.debug(f"[TempFile:{self.namespace}]Created temporary file directory: {self.temp_dir}")
            except OSError as e:
                logger.error(f"[TempFile:{self.namespace}]Failed to create temporary file directory: {self.temp_dir}, Error: {e}")

    def _get_file_path(self, file_id: str, extension: str = "") -> str:
        """Generate file storage path.

        Args:
            file_id: File ID
            extension: File extension

        Returns:
            Complete file path
        """
        if extension and not extension.startswith('.'):
            extension = f'.{extension}'
        return os.path.join(self.temp_dir, f"{file_id}{extension}")

    def _get_meta_path(self, file_id: str) -> str:
        """Generate metadata file path."""
        return os.path.join(self.temp_dir, f"{file_id}.meta.json")

    @staticmethod
    def generate_file_id() -> str:
        """Generate a file ID."""
        return worker.get_id()

    def save(self, file_obj: bytes, extension: str = "",
             ttl: Optional[timedelta] = None, file_id: Optional[str] = None) -> Optional[str]:
        """Save a temporary file.

        Args:
            file_obj: File object (binary mode)
            extension: File extension (e.g. 'pdf', '.jpg')
            ttl: Expiration duration; uses default if None
            file_id: Specific file ID; auto-generated if None

        Returns:
            File ID, or None on failure
        """

        self._ensure_temp_dir()
        self._check_and_run_cleanup()

        # Generate or use specified file ID
        if file_id is None:
            file_id = self.generate_file_id()

        file_path = self._get_file_path(file_id, extension)
        meta_path = self._get_meta_path(file_id)

        try:
            # Save file content
            with open(file_path, 'wb') as f:
                f.write(file_obj)

            # Calculate expiration time
            expires_at = None
            if ttl or self.default_ttl:
                use_ttl = ttl if ttl else self.default_ttl
                expires_at = (datetime.now(timezone.utc) + use_ttl).isoformat()

            # Save metadata
            metadata = {
                'file_id': file_id,
                'file_path': file_path,
                'extension': extension,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'expires_at': expires_at,
                'file_size': os.path.getsize(file_path)
            }

            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)

            logger.debug(f"[TempFile:{self.namespace}]Saved temporary file: {file_id} -> {file_path}")
            return file_id

        except Exception as e:
            logger.error(f"[TempFile:{self.namespace}]Failed to save temporary file: file_id={file_id}, Error: {e}")
            # Clean up any partially written files
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                if os.path.exists(meta_path):
                    os.remove(meta_path)
            except OSError:
                pass
            return None

    def get(self, file_id: str) -> Optional[str]:
        """Get temporary file path."""

        meta_path = self._get_meta_path(file_id)
        self._check_and_run_cleanup()

        if not os.path.exists(meta_path):
            return None

        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            file_path = metadata.get('file_path')

            # Check if file exists
            if file_path and os.path.exists(file_path):
                return file_path
            else:
                # File missing, clean up metadata
                self.delete(file_id)
                logger.warning(f"[TempFile:{self.namespace}]Temporary file not found, cleaned up: {file_id}")
                return None

        except Exception as e:
            logger.error(f"[TempFile:{self.namespace}]Failed to get temporary file: file_id={file_id}, Error: {e}")
            return None

    def delete(self, file_id: str) -> bool:
        """Delete a temporary file."""

        meta_path = self._get_meta_path(file_id)

        try:
            # Read metadata to get file path
            if os.path.exists(meta_path):
                with open(meta_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                file_path = metadata.get('file_path')

                # Delete file
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)

                # Delete metadata
                os.remove(meta_path)
                logger.debug(f"[TempFile:{self.namespace}]Deleted temporary file: {file_id}")
                return True

            return True  # Treat missing file as successful deletion

        except Exception as e:
            logger.error(f"[TempFile:{self.namespace}]Failed to delete temporary file: file_id={file_id}, Error: {e}")
            return False

    def _check_and_run_cleanup(self) -> None:
        """Check if cleanup task needs to run (cleanup every 6 hours)."""

        now = datetime.now(timezone.utc)
        if self._last_cleanup_time is None or (now - self._last_cleanup_time) >= timedelta(hours=6):
            logger.info(f"[FileCache:{self.namespace}]Triggering cache cleanup task...")
            self.cleanup_expired()
            self._last_cleanup_time = now

    def cleanup_expired(self) -> int:
        """Clean up all expired temporary files."""
        if not os.path.exists(self.temp_dir):
            return 0

        cleaned_count = 0

        try:
            for filename in os.listdir(self.temp_dir):
                if filename.endswith('.meta.json'):
                    meta_path = os.path.join(self.temp_dir, filename)

                    try:
                        with open(meta_path, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)

                        expires_at_str = metadata.get('expires_at')
                        if expires_at_str:
                            expires_at = datetime.fromisoformat(expires_at_str)
                            if datetime.now(timezone.utc) > expires_at:
                                file_id = metadata.get('file_id')
                                if file_id and self.delete(file_id):
                                    cleaned_count += 1

                    except (json.JSONDecodeError, KeyError, FileNotFoundError):
                        continue
                    except Exception as e:
                        logger.warning(f"[TempFile:{self.namespace}]Error cleaning file {meta_path}: {e}")

        except Exception as e:
            logger.error(f"[TempFile:{self.namespace}]Error during cleanup task: {e}")

        if cleaned_count > 0:
            logger.info(f"[TempFile:{self.namespace}]Cleaned up {cleaned_count} expired temporary file(s)")

        return cleaned_count

    def clear_all(self) -> bool:
        """Clear all temporary files under namespace."""
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
                logger.info(f"[TempFile:{self.namespace}]Cleared all temporary files: {self.temp_dir}")
                self._ensure_temp_dir()
                return True
            except OSError as e:
                logger.error(f"[TempFile:{self.namespace}]Failed to clear temporary files: {self.temp_dir}, Error: {e}")
                return False

        return True

    def exists(self, file_id: str) -> bool:
        """Check whether a temporary file exists and has not expired."""
        return self.get(file_id) is not None

    def get_file_info(self, file_id: str) -> Optional[dict]:
        """Get metadata for a temporary file."""
        meta_path = self._get_meta_path(file_id)

        if not os.path.exists(meta_path):
            return None

        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            # Check if expired
            expires_at_str = metadata.get('expires_at')
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now(timezone.utc) > expires_at:
                    return None

            return metadata

        except Exception as e:
            logger.error(f"[TempFile:{self.namespace}]Failed to get file info: file_id={file_id}, Error: {e}")
            return None


@lru_cache()
def get_temp_file_manager(namespace: str = "files",
                          default_ttl_hours: int = 24) -> TempFile:
    """Get temporary file manager instance.

    Args:
        namespace: Namespace
        default_ttl_hours: Default expiration time (hours)

    Returns:
        TempFile manager instance
    """
    return TempFile(namespace=namespace, default_ttl_hours=default_ttl_hours)

# Example usage:
# from io import BytesIO
#
# # Create temporary file manager
# temp_mgr = TempFile(namespace="upload_files", default_ttl_hours=2)
#
# # 1. Save an uploaded file
# with open("/path/to/uploaded.pdf", "rb") as f:
#     file_id = temp_mgr.save(f, extension="pdf", ttl=timedelta(hours=6))
#     print(f"File saved, ID: {file_id}")
#
# # 2. Save in-memory data
# image_data = BytesIO(b'fake image data...')
# file_id2 = temp_mgr.save(image_data, extension="jpg")
# print(f"Image saved, ID: {file_id2}")
#
# # 3. Get file path
# file_path = temp_mgr.get(file_id)
# if file_path:
#     print(f"File path: {file_path}")
#     with open(file_path, 'rb') as f:
#         content = f.read()
#         print(f"File size: {len(content)} bytes")
#
# # 4. Check if file exists
# if temp_mgr.exists(file_id):
#     print("File exists and is valid")
#
# # 5. Get file info
# info = temp_mgr.get_file_info(file_id)
# if info:
#     print(f"File info: {info}")
#
# # 6. Clean up expired files
# cleaned = temp_mgr.cleanup_expired()
# print(f"Cleaned up {cleaned} expired file(s)")
#
# # 7. Delete a specific file
# temp_mgr.delete(file_id2)
# print(f"Deleted file: {file_id2}")
#
# # 8. Clear all temporary files
# # temp_mgr.clear_all()
