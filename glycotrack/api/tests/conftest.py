"""Test harness: a dedicated PostgreSQL database built with the real Alembic migrations."""

import os
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import Environment, Settings, get_settings
from app.db import get_session
from app.main import create_app

TEST_DB_URL = os.environ.get(
    "GLYCOTRACK_TEST_DATABASE_URL",
    "postgresql+psycopg://glycotrack:glycotrack-local-dev@localhost:5432/glycotrack_test",
)
API_ROOT = os.path.dirname(os.path.dirname(__file__))


def alembic_config(url: str) -> Config:
    cfg = Config(os.path.join(API_ROOT, "alembic.ini"))
    cfg.attributes["database_url"] = url
    return cfg


def _recreate_database(url: str) -> None:
    target = make_url(url)
    admin = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{target.database}" WITH (FORCE)'))
        conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    _recreate_database(TEST_DB_URL)
    command.upgrade(alembic_config(TEST_DB_URL), "head")
    eng = create_engine(TEST_DB_URL)
    yield eng
    eng.dispose()


@pytest.fixture
def settings() -> Settings:
    return Settings(environment=Environment.test, database_url=TEST_DB_URL)


@pytest.fixture
def client(engine: Engine, settings: Settings) -> Iterator[TestClient]:
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override() -> Iterator[Session]:
        with factory() as session:
            yield session

    app = create_app(settings)
    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app) as c:
        yield c
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE users CASCADE"))


def as_user(subject: str) -> dict[str, str]:
    return {"X-Dev-User": subject}


ALICE = as_user("alice@example.test")
BOB = as_user("bob@example.test")
