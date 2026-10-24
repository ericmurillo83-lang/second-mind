"""Meals, medications and care resources, including relationships and cascades."""

from datetime import UTC, date, datetime, timedelta

from fastapi.testclient import TestClient

from .conftest import ALICE

RECIPE = {
    "name": "Lentil Soup",
    "servings": 6,
    "carbs_per_serving": 28,
    "prep_minutes": 40,
    "tags": ["Lunch", "Vegetarian"],
    "ingredients": ["Lentils", "Carrots"],
    "steps": ["Simmer"],
}
MEDICATION = {
    "name": "Metformin",
    "strength": "500 mg",
    "form": "tablet",
    "instructions": "As prescribed",
    "times": ["08:00", "19:00"],
}


def now_iso(hours: float = 0) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def test_recipe_crud_with_lists(client: TestClient) -> None:
    created = client.post("/v1/recipes", json=RECIPE, headers=ALICE).json()
    assert created["tags"] == ["Lunch", "Vegetarian"]
    assert created["favorite"] is False
    updated = client.put(
        f"/v1/recipes/{created['id']}", json={**RECIPE, "favorite": True}, headers=ALICE
    ).json()
    assert updated["favorite"] is True
    assert client.post("/v1/recipes", json={**RECIPE, "servings": 0}, headers=ALICE).status_code == 422


def test_meal_log_and_plan_follow_recipe_deletes(client: TestClient) -> None:
    recipe = client.post("/v1/recipes", json=RECIPE, headers=ALICE).json()
    meal = client.post(
        "/v1/meals",
        json={
            "eaten_at": now_iso(-1),
            "slot": "lunch",
            "title": "Soup",
            "carbs": 42,
            "recipe_id": recipe["id"],
            "servings": 1.5,
        },
        headers=ALICE,
    ).json()
    plan = client.post(
        "/v1/meal-plan",
        json={"day": date.today().isoformat(), "slot": "dinner", "recipe_id": recipe["id"]},
        headers=ALICE,
    )
    assert plan.status_code == 201
    assert client.delete(f"/v1/recipes/{recipe['id']}", headers=ALICE).status_code == 204
    # Logged meals are kept (unlinked); plan entries for the recipe go away. Same as the mobile app.
    assert client.get(f"/v1/meals/{meal['id']}", headers=ALICE).json()["recipe_id"] is None
    assert client.get("/v1/meal-plan", headers=ALICE).json() == []


def test_medication_times_are_validated_and_strength_is_text(client: TestClient) -> None:
    med = client.post("/v1/medications", json=MEDICATION, headers=ALICE).json()
    assert med["times"] == ["08:00", "19:00"]
    assert med["strength"] == "500 mg"
    bad = {**MEDICATION, "times": ["25:00"]}
    assert client.post("/v1/medications", json=bad, headers=ALICE).status_code == 422


def test_dose_logs_one_per_scheduled_time_and_cascade(client: TestClient) -> None:
    med = client.post("/v1/medications", json=MEDICATION, headers=ALICE).json()
    dose = {"medication_id": med["id"], "day": date.today().isoformat(), "time": "08:00", "status": "taken"}
    assert client.post("/v1/dose-logs", json=dose, headers=ALICE).status_code == 201
    assert client.post("/v1/dose-logs", json={**dose, "status": "skipped"}, headers=ALICE).status_code == 409
    assert client.post("/v1/dose-logs", json={**dose, "status": "maybe"}, headers=ALICE).status_code == 422
    client.delete(f"/v1/medications/{med['id']}", headers=ALICE)
    assert client.get("/v1/dose-logs", headers=ALICE).json() == []


def test_care_resources(client: TestClient) -> None:
    appt = client.post(
        "/v1/appointments",
        json={"title": "Eye exam", "provider": "Example Eye Center", "starts_at": now_iso(24 * 7)},
        headers=ALICE,
    )
    assert appt.status_code == 201
    assert appt.json()["duration_minutes"] == 30
    note = client.post(
        "/v1/notes", json={"title": "Questions", "body": "Ask about timing", "tags": ["Prep"]}, headers=ALICE
    )
    assert note.status_code == 201
    record = client.post(
        "/v1/records",
        json={"name": "Blood pressure", "value": "124/78", "unit": "mmHg", "recorded_on": "2026-10-14"},
        headers=ALICE,
    )
    assert record.json()["value"] == "124/78"  # stored exactly as reported
    too_long = client.post("/v1/notes", json={"title": "x" * 121}, headers=ALICE)
    assert too_long.status_code == 422
