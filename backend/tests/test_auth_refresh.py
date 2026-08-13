"""Tests for the mobile token refresh endpoint ``POST /api/v1/auth/refresh``.

Covers the happy path, token-type separation (an access token must never be
accepted as a refresh token), expiry / token_version revocation, unknown
users, malformed tokens, and the ``?client=mobile`` login variant that
returns a JSON token pair in the response body.
"""

import asyncio
from datetime import timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.gateway.auth import create_access_token
from app.gateway.auth.config import AuthConfig, set_auth_config
from app.gateway.auth.jwt import create_refresh_token
from app.gateway.auth.models import User

_TEST_SECRET = "test-secret-for-auth-refresh-tests-min32"


@pytest.fixture(autouse=True)
def _persistence_engine(tmp_path):
    """Same SQLite engine fixture used by the other auth HTTP tests."""
    from app.gateway import deps
    from deerflow.persistence.engine import close_engine, init_engine

    url = f"sqlite+aiosqlite:///{tmp_path}/auth_refresh.db"
    asyncio.run(init_engine("sqlite", url=url, sqlite_dir=str(tmp_path)))
    deps._cached_local_provider = None
    deps._cached_repo = None
    try:
        yield
    finally:
        deps._cached_local_provider = None
        deps._cached_repo = None
        asyncio.run(close_engine())


def _make_client() -> TestClient:
    from app.gateway.app import create_app

    return TestClient(create_app())


def _make_user(token_version: int = 0) -> User:
    return User(
        id=uuid4(),
        email="mobile@example.com",
        password_hash="unused-in-mock",
        token_version=token_version,
    )


def _stub_provider(monkeypatch: pytest.MonkeyPatch, user: User | None):
    """Point the auth router at a fake provider backed by the given user."""
    provider = AsyncMock()
    provider.get_user = AsyncMock(return_value=user)
    monkeypatch.setattr("app.gateway.routers.auth.get_local_provider", lambda: provider)
    return provider


def test_refresh_exchanges_valid_refresh_token(monkeypatch):
    """A valid refresh token yields a fresh access/refresh pair."""
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))
    user = _make_user()
    _stub_provider(monkeypatch, user)
    client = _make_client()

    refresh = create_refresh_token(str(user.id), token_version=user.token_version)
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})

    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != refresh
    assert body["expires_in"] == 7 * 24 * 3600


def test_refresh_rejects_access_token(monkeypatch):
    """An access token must not be accepted as a refresh token."""
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))
    user = _make_user()
    _stub_provider(monkeypatch, user)
    client = _make_client()

    access = create_access_token(str(user.id), token_version=user.token_version)
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": access})

    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "token_invalid"


def test_refresh_rejects_expired_token(monkeypatch):
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))
    user = _make_user()
    _stub_provider(monkeypatch, user)
    client = _make_client()

    expired = create_refresh_token(
        str(user.id),
        token_version=user.token_version,
        expires_delta=timedelta(seconds=-10),
    )
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": expired})

    assert resp.status_code == 401


def test_refresh_rejects_stale_token_version(monkeypatch):
    """Bumping token_version (e.g. password change) revokes outstanding refresh tokens."""
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))
    user = _make_user(token_version=1)
    _stub_provider(monkeypatch, user)
    client = _make_client()

    stale = create_refresh_token(str(user.id), token_version=0)
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": stale})

    assert resp.status_code == 401


def test_refresh_rejects_unknown_user(monkeypatch):
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))
    _stub_provider(monkeypatch, None)
    client = _make_client()

    token = create_refresh_token(str(uuid4()), token_version=0)
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": token})

    assert resp.status_code == 401


def test_refresh_rejects_garbage_token():
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))
    client = _make_client()

    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-jwt"})

    assert resp.status_code == 401


def test_login_local_mobile_returns_token_pair():
    """login/local with ?client=mobile returns access + refresh tokens in the body."""
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))

    async def _create_user():
        from app.gateway.deps import get_local_provider

        provider = await get_local_provider()
        return await provider.create_user(
            email="mobile@example.com",
            password="strong-password-123",
        )

    asyncio.run(_create_user())
    client = _make_client()

    resp = client.post(
        "/api/v1/auth/login/local?client=mobile",
        data={"username": "mobile@example.com", "password": "strong-password-123"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["needs_setup"] is False


def test_login_local_without_client_param_omits_tokens():
    """Web login (no client=mobile) keeps the compact response contract."""
    set_auth_config(AuthConfig(jwt_secret=_TEST_SECRET))

    async def _create_user():
        from app.gateway.deps import get_local_provider

        provider = await get_local_provider()
        return await provider.create_user(
            email="web@example.com",
            password="strong-password-123",
        )

    asyncio.run(_create_user())
    client = _make_client()

    resp = client.post(
        "/api/v1/auth/login/local",
        data={"username": "web@example.com", "password": "strong-password-123"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" not in body
    assert "refresh_token" not in body
