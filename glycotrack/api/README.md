# GlycoTrack API (Milestone 2: backend foundation)

FastAPI + SQLAlchemy 2 + Alembic on PostgreSQL. **Local development only.** The mobile app does
not talk to it yet; connecting them (accounts + sync) is a later milestone that needs the
decisions in [`../docs/APPROVALS.md`](../docs/APPROVALS.md).

## What's here

- User-scoped CRUD for every mobile collection: glucose readings, recipes, meal logs, meal plan,
  medications, dose logs, appointments, notes, health records (`/v1/...`).
- `GET /v1/glucose-readings/stats`: descriptive stats over a trailing window of `days` × 24 h
  (count, average, min/max, below/in/above the user's range). Same aggregation and percentage
  rounding as the app; the app's window is calendar days in the device's time zone. No
  predictions or alerts.
- `GET /v1/export` (all of my data) and `DELETE /v1/me` (delete account and everything).
- Validation mirrors the app (plausible glucose entry range, `HH:MM` times, timezone-aware
  timestamps, no unknown fields).
- `client_id` on every record (the app's local id) with per-user uniqueness, ready for
  idempotent sync.
- Isolation: every query is filtered by user; other users' records return 404; references to
  another user's recipe or medication are rejected.
- **Safety:** no dosing, ratio, correction, alert or prediction fields or endpoints. Enforced by
  tests (`tests/test_privacy_and_safety.py`).

## Authentication (development only)

Requests identify the user with an `X-Dev-User: <any-id>` header; users are created on first
use. `app/config.py` **refuses to start** when `GLYCOTRACK_ENVIRONMENT=production` with dev
auth, and refuses `GLYCOTRACK_AUTH_MODE=oidc` until a real identity provider is approved and
implemented.

## Run locally

```bash
cd api
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"   # or: pip install -r requirements.lock.txt
docker compose up -d postgres            # or use a local PostgreSQL 16 with the same credentials
cp .env.example .env
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:create_app --factory --reload
# Interactive docs: http://127.0.0.1:8000/docs
```

```bash
curl -s localhost:8000/v1/glucose-readings -H 'X-Dev-User: demo' -H 'Content-Type: application/json' \
  -d '{"value_mgdl": 112, "taken_at": "2026-10-24T08:00:00Z", "context": "fasting"}'
```

## Test

Tests create a throwaway `glycotrack_test` database (the `glycotrack` role needs `CREATEDB`) and
build it with the real migrations.

```bash
.venv/bin/ruff check . && .venv/bin/ruff format --check .
.venv/bin/python -m pytest
```

Override the test database with `GLYCOTRACK_TEST_DATABASE_URL`.

## Layout

```
app/
  config.py    settings + startup safety guard
  db.py        engine/session
  models.py    SQLAlchemy models (mirror mobile/src/domain/types.ts)
  schemas.py   Pydantic request/response models and validation
  auth.py      development identity (X-Dev-User)
  crud.py      generic user-scoped CRUD router + ownership checks
  stats.py     descriptive glucose statistics (same math as the app)
  routers/     resource routers, export, account deletion
migrations/    Alembic (0001 initial schema)
tests/         pytest against PostgreSQL
```

## Known follow-ups

- Real authentication (approval #7), rate limiting, request logging without health data,
  deployment configuration (approval #8). None of these exist yet by design.
- Starlette prints a deprecation notice about its `httpx`-based test client. It's harmless today;
  revisit when upgrading test dependencies.
