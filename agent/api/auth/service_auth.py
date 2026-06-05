"""
Service-to-service authentication

[INPUT]: depends on settings for SERVICE_API_KEY
[OUTPUT]: Exposes verify_service_api_key FastAPI dependency
[POS]: Auth layer for non-interactive channels (API runs, Teams webhook, GitHub Actions)
[PROTOCOL]: Update this header on changes, then check CLAUDE.md
"""

from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader

from agent.core.config import settings
from agent.utils.logger import logger

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_service_api_key(
    request: Request,
    api_key: str = Security(api_key_header),
) -> str:
    """Validate the service API key from X-API-Key header.

    Returns the key on success (can be used for audit logging).
    Raises 401 if missing, 403 if invalid.
    """
    if not settings.DIGITAL_AI_AGENTS_SERVICE_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="DIGITAL_AI_AGENTS_SERVICE_API_TOKEN not configured on server",
        )

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing X-API-Key header",
        )

    if api_key != settings.DIGITAL_AI_AGENTS_SERVICE_API_TOKEN:
        logger.warning(f"Invalid service API key attempt from {request.client.host}")
        raise HTTPException(
            status_code=403,
            detail="Invalid API key",
        )

    return api_key
