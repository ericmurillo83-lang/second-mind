from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.stats import compute_stats, round_percentages

from .conftest import ALICE


def reading(value: float, hours_ago: float = 1, **extra: object) -> dict[str, object]:
    taken = datetime.now(UTC) - timedelta(hours=hours_ago)
    return {"value_mgdl": value, "taken_at": taken.isoformat(), "context": "fasting", **extra}


def test_crud_roundtrip(client: TestClient) -> None:
    created = client.post("/v1/glucose-readings", json=reading(112, note="Before walk"), headers=ALICE)
    assert created.status_code == 201
    body = created.json()
    assert body["value_mgdl"] == 112
    assert body["source"] == "manual"
    rid = body["id"]

    assert client.get(f"/v1/glucose-readings/{rid}", headers=ALICE).json()["note"] == "Before walk"

    updated = client.put(
        f"/v1/glucose-readings/{rid}", json=reading(118, context="after_meal"), headers=ALICE
    )
    assert updated.status_code == 200
    assert updated.json()["value_mgdl"] == 118
    assert updated.json()["context"] == "after_meal"
    assert updated.json()["note"] is None

    assert client.delete(f"/v1/glucose-readings/{rid}", headers=ALICE).status_code == 204
    assert client.get(f"/v1/glucose-readings/{rid}", headers=ALICE).status_code == 404


def test_list_is_newest_first_and_filterable(client: TestClient) -> None:
    for hours, value in [(30, 101), (2, 102), (10, 103)]:
        client.post("/v1/glucose-readings", json=reading(value, hours_ago=hours), headers=ALICE)
    values = [r["value_mgdl"] for r in client.get("/v1/glucose-readings", headers=ALICE).json()]
    assert values == [102, 103, 101]
    since = (datetime.now(UTC) - timedelta(hours=12)).isoformat()
    recent = client.get("/v1/glucose-readings", params={"since": since}, headers=ALICE).json()
    assert sorted(r["value_mgdl"] for r in recent) == [102, 103]


def test_validation(client: TestClient) -> None:
    bad = [
        reading(5),  # below plausible entry range
        reading(900),
        {**reading(100), "taken_at": "2026-10-24T08:00:00"},  # no timezone
        reading(100, context="sometime"),
        reading(100, source="cgm"),  # only manual entry exists today
        reading(100, insulin_units=4),  # unknown fields are rejected
    ]
    for payload in bad:
        assert client.post("/v1/glucose-readings", json=payload, headers=ALICE).status_code == 422, payload


def test_client_id_is_unique_per_user(client: TestClient) -> None:
    payload = reading(100, client_id="glu_local_1")
    assert client.post("/v1/glucose-readings", json=payload, headers=ALICE).status_code == 201
    assert client.post("/v1/glucose-readings", json=payload, headers=ALICE).status_code == 409


def test_stats_endpoint(client: TestClient) -> None:
    for value in (60, 100, 150, 250):
        client.post("/v1/glucose-readings", json=reading(value), headers=ALICE)
    client.post("/v1/glucose-readings", json=reading(300, hours_ago=24 * 10), headers=ALICE)  # outside 7 days
    stats = client.get("/v1/glucose-readings/stats", params={"days": 7}, headers=ALICE).json()
    assert stats["count"] == 4
    assert stats["average_mgdl"] == 140
    assert (stats["min_mgdl"], stats["max_mgdl"]) == (60, 250)
    assert (stats["pct_below"], stats["pct_in"], stats["pct_above"]) == (25, 50, 25)
    narrow = client.get(
        "/v1/glucose-readings/stats", params={"target_low_mgdl": 150, "target_high_mgdl": 160}, headers=ALICE
    )
    assert narrow.status_code == 422


def test_stats_matches_mobile_rounding() -> None:
    # Same cases as mobile/src/domain/glucose.test.ts
    assert round_percentages([1, 1, 1], 3) == [34, 33, 33]
    assert round_percentages([0, 0], 0) == [0, 0]
    stats = compute_stats([60, 100, 250], 70, 180)
    assert stats["pct_below"] + stats["pct_in"] + stats["pct_above"] == 100
    assert compute_stats([], 70, 180)["average_mgdl"] is None


def test_invalid_filters_are_rejected_not_server_errors(client: TestClient) -> None:
    response = client.get("/v1/glucose-readings", params={"since": "last tuesday"}, headers=ALICE)
    assert response.status_code == 422


def test_date_column_filters(client: TestClient) -> None:
    for day in ("2026-10-01", "2026-10-14"):
        client.post("/v1/records", json={"name": "A1C", "value": "7", "recorded_on": day}, headers=ALICE)
    recent = client.get("/v1/records", params={"since": "2026-10-10"}, headers=ALICE).json()
    assert [r["recorded_on"] for r in recent] == ["2026-10-14"]
