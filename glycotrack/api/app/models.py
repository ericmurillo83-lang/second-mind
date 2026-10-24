"""Database models. Mirrors the mobile app's data model (mobile/src/domain/types.ts).

SAFETY: these tables store what the user records. There are deliberately no columns for
calculated doses, insulin ratios, corrections or alerts (see docs/SAFETY.md).
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

GLUCOSE_CONTEXTS = ("fasting", "before_meal", "after_meal", "bedtime", "overnight", "other")
MEAL_SLOTS = ("breakfast", "lunch", "dinner", "snack")
MEDICATION_FORMS = ("tablet", "capsule", "liquid", "injection", "inhaler", "patch", "other")
DOSE_STATUSES = ("taken", "skipped")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Stable subject identifier from the identity provider (the dev header in local development).
    subject: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserOwned:
    """Columns shared by every user record. `client_id` holds the mobile app's local id for sync."""

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


def _unique_client_id(table: str) -> UniqueConstraint:
    return UniqueConstraint("user_id", "client_id", name=f"uq_{table}_user_client")


class GlucoseReading(UserOwned, Base):
    __tablename__ = "glucose_readings"
    __table_args__ = (
        _unique_client_id("glucose_readings"),
        CheckConstraint("value_mgdl BETWEEN 20 AND 600", name="ck_glucose_value_plausible"),
    )

    value_mgdl: Mapped[float] = mapped_column(Float)
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    context: Mapped[str] = mapped_column(Enum(*GLUCOSE_CONTEXTS, name="glucose_context"))
    source: Mapped[str] = mapped_column(String(32), default="manual")
    note: Mapped[str | None] = mapped_column(Text)


class Recipe(UserOwned, Base):
    __tablename__ = "recipes"
    __table_args__ = (_unique_client_id("recipes"),)

    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    servings: Mapped[int] = mapped_column(Integer)
    carbs_per_serving: Mapped[float] = mapped_column(Float)
    prep_minutes: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)
    ingredients: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    steps: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)


class MealLog(UserOwned, Base):
    __tablename__ = "meal_logs"
    __table_args__ = (_unique_client_id("meal_logs"),)

    eaten_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    slot: Mapped[str] = mapped_column(Enum(*MEAL_SLOTS, name="meal_slot"))
    title: Mapped[str] = mapped_column(String(120))
    carbs: Mapped[float] = mapped_column(Float)
    recipe_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("recipes.id", ondelete="SET NULL"))
    servings: Mapped[float | None] = mapped_column(Float)
    note: Mapped[str | None] = mapped_column(Text)


class MealPlanEntry(UserOwned, Base):
    __tablename__ = "meal_plan_entries"
    __table_args__ = (_unique_client_id("meal_plan_entries"),)

    day: Mapped[date] = mapped_column(Date, index=True)
    slot: Mapped[str] = mapped_column(Enum(*MEAL_SLOTS, name="meal_slot"))
    recipe_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))
    servings: Mapped[float] = mapped_column(Float, default=1)


class Medication(UserOwned, Base):
    __tablename__ = "medications"
    __table_args__ = (_unique_client_id("medications"),)

    name: Mapped[str] = mapped_column(String(80))
    # Exactly as written on the label. Free text by design: never parsed or calculated.
    strength: Mapped[str] = mapped_column(String(40), default="")
    form: Mapped[str] = mapped_column(Enum(*MEDICATION_FORMS, name="medication_form"))
    instructions: Mapped[str] = mapped_column(Text, default="")
    times: Mapped[list[str]] = mapped_column(ARRAY(String(5)), default=list)
    reminders_on: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    prescriber: Mapped[str | None] = mapped_column(String(80))
    refill_on: Mapped[date | None] = mapped_column(Date)


class DoseLog(UserOwned, Base):
    """Whether a scheduled medication time was marked taken or skipped by the user."""

    __tablename__ = "dose_logs"
    __table_args__ = (
        _unique_client_id("dose_logs"),
        UniqueConstraint("user_id", "medication_id", "day", "time", name="uq_dose_logs_slot"),
    )

    medication_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medications.id", ondelete="CASCADE"))
    day: Mapped[date] = mapped_column(Date)
    time: Mapped[str] = mapped_column(String(5))
    status: Mapped[str] = mapped_column(Enum(*DOSE_STATUSES, name="dose_status"))


class Appointment(UserOwned, Base):
    __tablename__ = "appointments"
    __table_args__ = (_unique_client_id("appointments"),)

    title: Mapped[str] = mapped_column(String(120))
    provider: Mapped[str] = mapped_column(String(120), default="")
    specialty: Mapped[str] = mapped_column(String(80), default="")
    location: Mapped[str] = mapped_column(String(200), default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    notes: Mapped[str] = mapped_column(Text, default="")


class MedicalNote(UserOwned, Base):
    __tablename__ = "medical_notes"
    __table_args__ = (_unique_client_id("medical_notes"),)

    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)


class HealthRecord(UserOwned, Base):
    __tablename__ = "health_records"
    __table_args__ = (_unique_client_id("health_records"),)

    name: Mapped[str] = mapped_column(String(120))
    # Stored as text exactly as reported (e.g. "124/78"). Never interpreted.
    value: Mapped[str] = mapped_column(String(60))
    unit: Mapped[str] = mapped_column(String(40), default="")
    recorded_on: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
