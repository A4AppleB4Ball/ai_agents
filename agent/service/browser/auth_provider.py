"""Browser auth provider for internal/SSO-protected sites.

Retrieves the current user's authentication credentials (token or cookies)
so that headless browser sessions can access internal corporate sites
that require Microsoft Entra ID SSO.
"""

from agent.core.config import _current_user_email, settings
from agent.utils.logger import logger


async def get_user_auth_token() -> str | None:
    """Get the current user's auth token for browser session injection.

    The token is stored per-user when they authenticate with the platform.
    It can be used as a Bearer token for internal sites that accept the same
    Azure AD token as our backend.

    Returns:
        The user's JWT token if available, None otherwise.
    """
    from agent.service.browser.token_store import get_stored_token

    user_email = _current_user_email.get()
    if not user_email or user_email == "anonymous":
        return None

    token = await get_stored_token(user_email)
    if token:
        logger.info(f"Auth token retrieved for browser session: {user_email}")
    return token


async def get_user_cookies_for_domain(domain: str) -> list[dict] | None:
    """Get stored cookies for a specific domain.

    This is an alternative to token-based auth for sites that use
    cookie-based SSO sessions.

    Returns:
        List of cookie dicts or None.
    """
    from agent.service.browser.token_store import get_stored_cookies

    user_email = _current_user_email.get()
    if not user_email or user_email == "anonymous":
        return None

    return await get_stored_cookies(user_email, domain)
