from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import delete, select

from .. import models as m
from .. import schemas as s
from ..auth import CurrentUser, DbSession
from ..crud import crud_router, require_owned
from ..stats import compute_stats

glucose_extras = APIRouter(prefix="/v1/glucose-readings", tags=["glucose"])


@glucose_extras.get("/stats", response_model=s.GlucoseStats, summary="Descriptive statistics")
def glucose_stats(
    user: CurrentUser,
    session: DbSession,
    days: int = Query(default=7, ge=1, le=365),
    target_low_mgdl: float = Query(default=70, ge=40, le=380),
    target_high_mgdl: float = Query(default=180, ge=60, le=400),
) -> Any:
    if target_high_mgdl - target_low_mgdl < 20:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Target range is too narrow.")
    since = datetime.now(UTC) - timedelta(days=days)
    values = session.scalars(
        select(m.GlucoseReading.value_mgdl).where(
            m.GlucoseReading.user_id == user.id, m.GlucoseReading.taken_at >= since
        )
    ).all()
    return {
        "days": days,
        "target_low_mgdl": target_low_mgdl,
        "target_high_mgdl": target_high_mgdl,
        **compute_stats(values, target_low_mgdl, target_high_mgdl),
    }


account = APIRouter(prefix="/v1", tags=["account"])

EXPORT_TABLES: dict[str, tuple[type[m.Base], type[s.BaseModel]]] = {
    "glucose": (m.GlucoseReading, s.GlucoseOut),
    "recipes": (m.Recipe, s.RecipeOut),
    "meals": (m.MealLog, s.MealLogOut),
    "meal_plan": (m.MealPlanEntry, s.MealPlanOut),
    "medications": (m.Medication, s.MedicationOut),
    "dose_logs": (m.DoseLog, s.DoseLogOut),
    "appointments": (m.Appointment, s.AppointmentOut),
    "notes": (m.MedicalNote, s.NoteOut),
    "records": (m.HealthRecord, s.HealthRecordOut),
}


@account.get("/export", summary="Export all of my data")
def export_my_data(user: CurrentUser, session: DbSession) -> dict[str, Any]:
    data = {
        key: [
            out.model_validate(r).model_dump(mode="json")
            for r in session.scalars(select(model).where(model.user_id == user.id).order_by(model.created_at))
        ]
        for key, (model, out) in EXPORT_TABLES.items()
    }
    return {"app": "GlycoTrack", "exported_at": datetime.now(UTC).isoformat(), "data": data}


@account.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Delete my account and all data")
def delete_my_account(user: CurrentUser, session: DbSession) -> Response:
    # Child rows are removed by ON DELETE CASCADE.
    session.execute(delete(m.User).where(m.User.id == user.id))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


resource_routers = [
    glucose_extras,  # before the generic /{record_id} routes so "/stats" isn't parsed as an id
    crud_router(
        model=m.GlucoseReading,
        schema_in=s.GlucoseIn,
        schema_out=s.GlucoseOut,
        path="/v1/glucose-readings",
        order_by=m.GlucoseReading.taken_at.desc(),
        time_column=m.GlucoseReading.taken_at,
        tag="glucose",
    ),
    crud_router(
        model=m.Recipe,
        schema_in=s.RecipeIn,
        schema_out=s.RecipeOut,
        path="/v1/recipes",
        order_by=m.Recipe.name,
        tag="meals",
    ),
    crud_router(
        model=m.MealLog,
        schema_in=s.MealLogIn,
        schema_out=s.MealLogOut,
        path="/v1/meals",
        order_by=m.MealLog.eaten_at.desc(),
        time_column=m.MealLog.eaten_at,
        validators=(require_owned(m.Recipe, "recipe_id"),),
        tag="meals",
    ),
    crud_router(
        model=m.MealPlanEntry,
        schema_in=s.MealPlanIn,
        schema_out=s.MealPlanOut,
        path="/v1/meal-plan",
        order_by=m.MealPlanEntry.day,
        time_column=m.MealPlanEntry.day,
        validators=(require_owned(m.Recipe, "recipe_id"),),
        tag="meals",
    ),
    crud_router(
        model=m.Medication,
        schema_in=s.MedicationIn,
        schema_out=s.MedicationOut,
        path="/v1/medications",
        order_by=m.Medication.name,
        tag="medications",
    ),
    crud_router(
        model=m.DoseLog,
        schema_in=s.DoseLogIn,
        schema_out=s.DoseLogOut,
        path="/v1/dose-logs",
        order_by=m.DoseLog.day.desc(),
        time_column=m.DoseLog.day,
        validators=(require_owned(m.Medication, "medication_id"),),
        tag="medications",
    ),
    crud_router(
        model=m.Appointment,
        schema_in=s.AppointmentIn,
        schema_out=s.AppointmentOut,
        path="/v1/appointments",
        order_by=m.Appointment.starts_at,
        time_column=m.Appointment.starts_at,
        tag="care",
    ),
    crud_router(
        model=m.MedicalNote,
        schema_in=s.NoteIn,
        schema_out=s.NoteOut,
        path="/v1/notes",
        order_by=m.MedicalNote.updated_at.desc(),
        tag="care",
    ),
    crud_router(
        model=m.HealthRecord,
        schema_in=s.HealthRecordIn,
        schema_out=s.HealthRecordOut,
        path="/v1/records",
        order_by=m.HealthRecord.recorded_on.desc(),
        time_column=m.HealthRecord.recorded_on,
        tag="care",
    ),
    account,
]
