from fastapi import APIRouter, Depends

from agent.api.auth.dependencies import UserInfo, get_current_user_from_request

router = APIRouter(tags=["auth"])


@router.get("/auth/me", response_model=UserInfo)
async def get_me(user: UserInfo = Depends(get_current_user_from_request)) -> UserInfo:
    """Return the current authenticated user info."""
    return user
