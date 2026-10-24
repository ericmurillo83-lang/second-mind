"""User isolation, export/deletion, and safety guards on the data model."""

import re
from datetime import UTC, date, datetime

from fastapi.testclient import TestClient

from app.db import Base

from .conftest import ALICE, BOB

RECIPE = {"name": "Oats", "servings": 1, "carbs_per_serving": 34}
MED = {"name": "Atorvastatin", "strength": "20 mg", "form": "tablet", "times": ["21:00"]}


def test_users_cannot_see_or_change_each_others_data(client: TestClient) -> None:
    note = client.post("/v1/notes", json={"title": "Private"}, headers=ALICE).json()
    assert client.get("/v1/notes", headers=BOB).json() == []
    # Someone else's record looks exactly like a missing one.
    assert client.get(f"/v1/notes/{note['id']}", headers=BOB).status_code == 404
    assert client.put(f"/v1/notes/{note['id']}", json={"title": "Hacked"}, headers=BOB).status_code == 404
    assert client.delete(f"/v1/notes/{note['id']}", headers=BOB).status_code == 404
    assert client.get(f"/v1/notes/{note['id']}", headers=ALICE).json()["title"] == "Private"


def test_cannot_reference_another_users_records(client: TestClient) -> None:
    recipe = client.post("/v1/recipes", json=RECIPE, headers=ALICE).json()
    med = client.post("/v1/medications", json=MED, headers=ALICE).json()
    meal = {
        "eaten_at": datetime.now(UTC).isoformat(),
        "slot": "breakfast",
        "title": "Oats",
        "carbs": 34,
        "recipe_id": recipe["id"],
    }
    assert client.post("/v1/meals", json=meal, headers=BOB).status_code == 422
    plan = {"day": date.today().isoformat(), "slot": "lunch", "recipe_id": recipe["id"]}
    assert client.post("/v1/meal-plan", json=plan, headers=BOB).status_code == 422
    dose = {"medication_id": med["id"], "day": date.today().isoformat(), "time": "21:00", "status": "taken"}
    assert client.post("/v1/dose-logs", json=dose, headers=BOB).status_code == 422
    assert client.post("/v1/dose-logs", json=dose, headers=ALICE).status_code == 201


def test_same_client_id_is_fine_across_users(client: TestClient) -> None:
    payload = {"title": "Note", "client_id": "note_1"}
    assert client.post("/v1/notes", json=payload, headers=ALICE).status_code == 201
    assert client.post("/v1/notes", json=payload, headers=BOB).status_code == 201


def test_export_contains_only_my_data(client: TestClient) -> None:
    client.post("/v1/notes", json={"title": "Alice note"}, headers=ALICE)
    client.post("/v1/recipes", json=RECIPE, headers=ALICE)
    client.post("/v1/notes", json={"title": "Bob note"}, headers=BOB)
    exported = client.get("/v1/export", headers=ALICE).json()
    assert exported["app"] == "GlycoTrack"
    assert set(exported["data"]) == {
        "glucose",
        "recipes",
        "meals",
        "meal_plan",
        "medications",
        "dose_logs",
        "appointments",
        "notes",
        "records",
    }
    assert [n["title"] for n in exported["data"]["notes"]] == ["Alice note"]
    assert len(exported["data"]["recipes"]) == 1


def test_delete_account_removes_everything_for_that_user_only(client: TestClient) -> None:
    med = client.post("/v1/medications", json=MED, headers=ALICE).json()
    client.post(
        "/v1/dose-logs",
        json={"medication_id": med["id"], "day": "2026-10-24", "time": "21:00", "status": "taken"},
        headers=ALICE,
    )
    client.post("/v1/notes", json={"title": "Bob keeps this"}, headers=BOB)
    assert client.delete("/v1/me", headers=ALICE).status_code == 204
    exported = client.get("/v1/export", headers=ALICE).json()["data"]  # a fresh, empty account
    assert all(rows == [] for rows in exported.values())
    assert len(client.get("/v1/notes", headers=BOB).json()) == 1


# SAFETY guard: the schema must never grow dosing, alerting or advice fields (docs/SAFETY.md).
# Matched against whole name tokens (split on _ / -), so e.g. "duration" doesn't match "ratio".
FORBIDDEN_TOKENS = {
    "insulin",
    "bolus",
    "basal",
    "correction",
    "ratio",
    "ratios",
    "sensitivity",
    "isf",
    "icr",
    "recommend",
    "recommendation",
    "recommendations",
    "advice",
    "alert",
    "alerts",
    "alarm",
    "alarms",
    "predict",
    "prediction",
    "predictions",
    "units",
}


def forbidden(name: str) -> bool:
    return bool(FORBIDDEN_TOKENS & set(re.split(r"[_/\-{}]+", name.lower())))


def test_data_model_has_no_dosing_or_alert_fields() -> None:
    offenders = [
        f"{table.name}.{column.name}"
        for table in Base.metadata.sorted_tables
        for column in table.columns
        if forbidden(column.name) or forbidden(table.name)
    ]
    assert offenders == []


def test_api_has_no_dosing_or_alert_endpoints(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert [p for p in paths if forbidden(p)] == []


def test_safety_token_matcher() -> None:
    assert forbidden("insulin_units") and forbidden("/v1/bolus-calculator") and forbidden("carb_ratio")
    assert not forbidden("duration_minutes") and not forbidden("dose_logs")


def test_medication_strength_is_never_numeric() -> None:
    from app.models import Medication

    assert Medication.__table__.c.strength.type.python_type is str
