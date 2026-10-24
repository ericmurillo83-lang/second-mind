from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import AuthMode, Settings, get_settings
from .db import get_session
from .models import User

DEV_USER_HEADER = "X-Dev-User"


def get_current_user(
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    x_dev_user: Annotated[str | None, Header(alias=DEV_USER_HEADER, max_length=255)] = None,
) -> User:
    """Resolve the calling user.

    Local development only: identity comes from the `X-Dev-User` header and users are created on
    first use. Production startup is blocked until a real identity provider replaces this
    (see config.assert_safe_to_start).
    """
    if settings.auth_mode != AuthMode.dev:  # pragma: no cover - startup guard prevents this
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Authentication is not configured.")
    subject = (x_dev_user or "").strip()
    if not subject:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Missing {DEV_USER_HEADER} header (development authentication).",
        )
    user = session.scalar(select(User).where(User.subject == subject))
    if user is None:
        user = User(subject=subject)
        session.add(user)
        session.commit()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]
