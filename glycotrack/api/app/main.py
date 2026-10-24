from typing import Any

from fastapi import FastAPI
from sqlalchemy import text

from .auth import DbSession
from .config import Settings, assert_safe_to_start, get_settings
from .routers import resource_routers

DESCRIPTION = """
GlycoTrack backend foundation. **Local development only.**

Stores what users record (glucose readings, meals, recipes, medications, appointments, notes and
records). It never calculates doses, makes treatment decisions or raises glucose alerts.

Development authentication: send an `X-Dev-User` header. The server refuses to start in
production until an approved identity provider is configured.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    assert_safe_to_start(settings)
    app = FastAPI(title="GlycoTrack API", version="0.1.0", description=DESCRIPTION)

    @app.get("/health", tags=["health"], summary="Liveness")
    def health() -> dict[str, Any]:
        return {"status": "ok", "environment": settings.environment.value}

    @app.get("/health/db", tags=["health"], summary="Database connectivity")
    def health_db(session: DbSession) -> dict[str, str]:
        session.execute(text("SELECT 1"))
        return {"status": "ok"}

    for router in resource_routers:
        app.include_router(router)
    return app
