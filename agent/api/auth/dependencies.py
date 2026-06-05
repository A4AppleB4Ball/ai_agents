from typing import Optional

import httpx
from fastapi import HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel

from agent.core.config import _current_user_email, settings
from agent.utils.logger import logger


class UserInfo(BaseModel):
    user_id: str
    email: str
    name: str
    groups: list[str]


_jwks_cache: Optional[dict] = None


async def _fetch_jwks(tenant_id: str) -> dict:
    """Fetch JWKS keys from Microsoft Entra ID."""
    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        return response.json()


async def _get_jwks(tenant_id: str, force_refresh: bool = False) -> dict:
    """Get JWKS keys with caching. Refresh if forced."""
    global _jwks_cache
    if _jwks_cache is None or force_refresh:
        _jwks_cache = await _fetch_jwks(tenant_id)
    return _jwks_cache


def _decode_token(token: str, jwks: dict, tenant_id: str, client_id: str) -> dict:
    """Decode and validate a JWT token against JWKS keys."""
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    rsa_key = None
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            rsa_key = key
            break

    if rsa_key is None:
        raise HTTPException(status_code=401, detail="Token signing key not found")

    claims = jwt.decode(
        token,
        rsa_key,
        algorithms=["RS256"],
        audience=client_id,
        issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0",
    )
    return claims


async def verify_token(token: str) -> UserInfo:
    """Verify a Microsoft Entra ID token and return UserInfo."""
    tenant_id = settings.SSO_TENANT_ID
    client_id = settings.SSO_CLIENT_ID

    if not tenant_id or not client_id:
        raise HTTPException(
            status_code=401, detail="SSO not configured: SSO_TENANT_ID and SSO_CLIENT_ID required"
        )

    jwks = await _get_jwks(tenant_id)

    try:
        claims = _decode_token(token, jwks, tenant_id, client_id)
    except (JWTError, HTTPException):
        # Retry with refreshed JWKS in case keys rotated
        jwks = await _get_jwks(tenant_id, force_refresh=True)
        try:
            claims = _decode_token(token, jwks, tenant_id, client_id)
        except (JWTError, HTTPException) as e:
            logger.error(f"Token verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = claims.get("oid", "")
    email = claims.get("preferred_username") or claims.get("email", "")
    name = claims.get("name", "")
    groups = claims.get("groups", [])

    return UserInfo(user_id=user_id, email=email, name=name, groups=groups)


async def get_current_user_from_request(request: Request) -> UserInfo:
    """FastAPI dependency that extracts and verifies the user from the Authorization header."""
    if settings.DISABLE_AUTH:
        user = UserInfo(user_id="dev", email="dev@local", name="Developer", groups=[])
        _current_user_email.set(user.email)
        return user

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.removeprefix("Bearer ").strip()
    user = await verify_token(token)
    _current_user_email.set(user.email)
    return user
