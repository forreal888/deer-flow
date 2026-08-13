"""JWT token creation and verification."""

from datetime import UTC, datetime, timedelta

import jwt
from pydantic import BaseModel

from app.gateway.auth.config import get_auth_config
from app.gateway.auth.errors import TokenError


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str  # user_id
    exp: datetime
    iat: datetime | None = None
    ver: int = 0  # token_version — must match User.token_version
    typ: str = "access"  # token purpose: "access" | "refresh"


def create_access_token(
    user_id: str,
    expires_delta: timedelta | None = None,
    token_version: int = 0,
    token_type: str = "access",
) -> str:
    """Create a JWT token.

    Args:
        user_id: The user's UUID as string
        expires_delta: Optional custom expiry, defaults to 7 days
        token_version: User's current token_version for invalidation
        token_type: Token purpose — ``"access"`` (default) or ``"refresh"``

    Returns:
        Encoded JWT string
    """
    config = get_auth_config()
    expiry = expires_delta or timedelta(days=config.token_expiry_days)

    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "exp": now + expiry,
        "iat": now,
        "ver": token_version,
        "typ": token_type,
    }
    return jwt.encode(payload, config.jwt_secret, algorithm="HS256")


def create_refresh_token(
    user_id: str,
    token_version: int = 0,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a long-lived JWT refresh token for non-browser clients.

    Refresh tokens default to ``refresh_token_expiry_days`` (30 days) and
    carry ``typ=refresh`` so they can never be used as access tokens.
    Revocation is enforced via ``User.token_version``: bumping it
    invalidates every outstanding access/refresh token for that user.
    """
    config = get_auth_config()
    expiry = expires_delta or timedelta(days=config.refresh_token_expiry_days)
    return create_access_token(
        user_id,
        expires_delta=expiry,
        token_version=token_version,
        token_type="refresh",
    )


def decode_token(token: str) -> TokenPayload | TokenError:
    """Decode and validate a JWT token.

    Returns:
        TokenPayload if valid, or a specific TokenError variant.
    """
    config = get_auth_config()
    try:
        payload = jwt.decode(token, config.jwt_secret, algorithms=["HS256"])
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        return TokenError.EXPIRED
    except jwt.InvalidSignatureError:
        return TokenError.INVALID_SIGNATURE
    except jwt.PyJWTError:
        return TokenError.MALFORMED
