from enum import StrEnum
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    development = "development"
    test = "test"
    production = "production"


class AuthMode(StrEnum):
    # Header-based identity for local development and tests only.
    dev = "dev"
    # Placeholder for the approved identity provider (see docs/APPROVALS.md #7). Not implemented.
    oidc = "oidc"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GLYCOTRACK_", env_file=".env", extra="ignore")

    environment: Environment = Environment.development
    auth_mode: AuthMode = AuthMode.dev
    database_url: str = "postgresql+psycopg://glycotrack:glycotrack-local-dev@localhost:5432/glycotrack"


class UnsafeConfigurationError(RuntimeError):
    """Raised at startup when the configuration would expose health data without real auth."""


def assert_safe_to_start(settings: Settings) -> None:
    if settings.auth_mode == AuthMode.dev and settings.environment == Environment.production:
        raise UnsafeConfigurationError(
            "Refusing to start: development header auth cannot run in production. "
            "Configure an approved identity provider first (docs/APPROVALS.md #7)."
        )
    if settings.auth_mode == AuthMode.oidc:
        raise UnsafeConfigurationError(
            "Refusing to start: OIDC auth is not implemented yet. It requires an approved identity provider."
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
