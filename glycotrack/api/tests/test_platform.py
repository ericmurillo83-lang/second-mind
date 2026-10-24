"""Health checks, startup safety guard, authentication, migrations."""

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine

from app.config import AuthMode, Environment, Settings, UnsafeConfigurationError
from app.db import Base
from app.main import create_app

from .conftest import ALICE, TEST_DB_URL, alembic_config


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok", "environment": "test"}
    assert client.get("/health/db").json() == {"status": "ok"}


def test_requires_identity(client: TestClient) -> None:
    response = client.get("/v1/glucose-readings")
    assert response.status_code == 401
    assert "X-Dev-User" in response.json()["detail"]
    assert client.get("/v1/glucose-readings", headers={"X-Dev-User": "   "}).status_code == 401


def test_refuses_dev_auth_in_production() -> None:
    with pytest.raises(UnsafeConfigurationError, match="cannot run in production"):
        create_app(Settings(environment=Environment.production, auth_mode=AuthMode.dev))


def test_refuses_unimplemented_oidc() -> None:
    with pytest.raises(UnsafeConfigurationError, match="not implemented"):
        create_app(Settings(environment=Environment.development, auth_mode=AuthMode.oidc))


def test_starts_in_development_and_test() -> None:
    create_app(Settings(environment=Environment.development))
    create_app(Settings(environment=Environment.test))


def test_openapi_documents_every_resource(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    for resource in (
        "glucose-readings",
        "recipes",
        "meals",
        "meal-plan",
        "medications",
        "dose-logs",
        "appointments",
        "notes",
        "records",
    ):
        assert f"/v1/{resource}" in paths
        assert f"/v1/{resource}/{{record_id}}" in paths


def test_migrations_match_models(engine: Engine) -> None:
    with engine.connect() as conn:
        diffs = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diffs == []


def test_migrations_downgrade_and_reapply(engine: Engine, client: TestClient) -> None:
    cfg = alembic_config(TEST_DB_URL)
    engine.dispose()  # release pooled connections so DDL isn't blocked
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    fresh = create_engine(TEST_DB_URL)
    with fresh.connect() as conn:
        assert compare_metadata(MigrationContext.configure(conn), Base.metadata) == []
    fresh.dispose()
    assert client.get("/v1/notes", headers=ALICE).status_code == 200
