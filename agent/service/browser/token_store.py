"""Token store for browser auth.

Stores and retrieves user tokens/cookies that were provided during authentication.
The frontend sends the user's token when they authenticate — we store it here
so browser sessions can use it for internal site access.
"""

import time
from typing import Optional

from agent.utils.logger import logger

_token_cache: dict[str, dict] = {}
_cookie_cache: dict[str, list[dict]] = {}

TOKEN_TTL_SECONDS = 3600


async def store_token(user_email: str, token: str) -> None:
    """Store a user's auth token for later use by browser sessions."""
    _token_cache[user_email] = {
        "token": token,
        "stored_at": time.time(),
    }
    logger.info(f"Token stored for browser auth: {user_email}")


async def get_stored_token(user_email: str) -> Optional[str]:
    """Retrieve a user's stored token. Returns None if expired or missing."""
    entry = _token_cache.get(user_email)
    if not entry:
        return None

    if time.time() - entry["stored_at"] > TOKEN_TTL_SECONDS:
        del _token_cache[user_email]
        return None

    return entry["token"]


async def store_cookies(user_email: str, cookies: list[dict]) -> None:
    """Store cookies for a user (from frontend SSO session)."""
    _cookie_cache[user_email] = cookies
    logger.info(f"Cookies stored for browser auth: {user_email} ({len(cookies)} cookies)")


async def get_stored_cookies(user_email: str, domain: str) -> Optional[list[dict]]:
    """Get cookies for a user filtered by domain."""
    cookies = _cookie_cache.get(user_email)
    if not cookies:
        return None

    filtered = [c for c in cookies if domain in c.get("domain", "")]
    return filtered if filtered else None


async def clear_user_auth(user_email: str) -> None:
    """Clear stored auth data for a user."""
    _token_cache.pop(user_email, None)
    _cookie_cache.pop(user_email, None)
