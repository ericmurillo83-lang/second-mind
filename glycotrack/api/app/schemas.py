"""Request/response schemas. Validation mirrors the mobile app's rules."""

import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

GlucoseContext = Literal["fasting", "before_meal", "after_meal", "bedtime", "overnight", "other"]
MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]
MedicationForm = Literal["tablet", "capsule", "liquid", "injection", "inhaler", "patch", "other"]
DoseStatus = Literal["taken", "skipped"]

TimeOfDay = Annotated[str, StringConstraints(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Line = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
ClientId = Annotated[str, StringConstraints(min_length=1, max_length=64)]


class InModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    client_id: ClientId | None = None


class OutModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    client_id: str | None
    created_at: datetime
    updated_at: datetime


# ---- Glucose ----


class GlucoseIn(InModel):
    # Plausibility bounds for entry (typo guard), not clinical thresholds.
    value_mgdl: float = Field(ge=20, le=600)
    taken_at: AwareDatetime
    context: GlucoseContext
    source: Literal["manual"] = "manual"
    note: str | None = Field(default=None, max_length=500)


class GlucoseOut(OutModel):
    value_mgdl: float
    taken_at: datetime
    context: GlucoseContext
    source: str
    note: str | None


class GlucoseStats(BaseModel):
    """Descriptive statistics only. No predictions, alerts or advice."""

    days: int
    target_low_mgdl: float
    target_high_mgdl: float
    count: int
    average_mgdl: float | None
    min_mgdl: float | None
    max_mgdl: float | None
    below: int
    in_range: int
    above: int
    pct_below: int
    pct_in: int
    pct_above: int


# ---- Meals ----


class RecipeIn(InModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=240)
    servings: int = Field(ge=1, le=24)
    carbs_per_serving: float = Field(ge=0, le=1000)
    prep_minutes: int = Field(default=0, ge=0, le=480)
    tags: list[Tag] = Field(default_factory=list, max_length=20)
    ingredients: list[Line] = Field(default_factory=list, max_length=100)
    steps: list[Line] = Field(default_factory=list, max_length=100)
    favorite: bool = False


class RecipeOut(OutModel):
    name: str
    description: str
    servings: int
    carbs_per_serving: float
    prep_minutes: int
    tags: list[str]
    ingredients: list[str]
    steps: list[str]
    favorite: bool


class MealLogIn(InModel):
    eaten_at: AwareDatetime
    slot: MealSlot
    title: str = Field(min_length=1, max_length=120)
    carbs: float = Field(ge=0, le=1000)
    recipe_id: uuid.UUID | None = None
    servings: float | None = Field(default=None, ge=0.5, le=12)
    note: str | None = Field(default=None, max_length=500)


class MealLogOut(OutModel):
    eaten_at: datetime
    slot: MealSlot
    title: str
    carbs: float
    recipe_id: uuid.UUID | None
    servings: float | None
    note: str | None


class MealPlanIn(InModel):
    day: date
    slot: MealSlot
    recipe_id: uuid.UUID
    servings: float = Field(default=1, ge=0.5, le=12)


class MealPlanOut(OutModel):
    day: date
    slot: MealSlot
    recipe_id: uuid.UUID
    servings: float


# ---- Medications ----


class MedicationIn(InModel):
    name: str = Field(min_length=1, max_length=80)
    # Exactly as written on the label. Free text by design: never parsed into a number.
    strength: str = Field(default="", max_length=40)
    form: MedicationForm
    instructions: str = Field(default="", max_length=500)
    times: list[TimeOfDay] = Field(default_factory=list, max_length=12)
    reminders_on: bool = True
    active: bool = True
    prescriber: str | None = Field(default=None, max_length=80)
    refill_on: date | None = None


class MedicationOut(OutModel):
    name: str
    strength: str
    form: MedicationForm
    instructions: str
    times: list[str]
    reminders_on: bool
    active: bool
    prescriber: str | None
    refill_on: date | None


class DoseLogIn(InModel):
    medication_id: uuid.UUID
    day: date
    time: TimeOfDay
    status: DoseStatus


class DoseLogOut(OutModel):
    medication_id: uuid.UUID
    day: date
    time: str
    status: DoseStatus


# ---- Care ----


class AppointmentIn(InModel):
    title: str = Field(min_length=1, max_length=120)
    provider: str = Field(default="", max_length=120)
    specialty: str = Field(default="", max_length=80)
    location: str = Field(default="", max_length=200)
    starts_at: AwareDatetime
    duration_minutes: int = Field(default=30, ge=5, le=480)
    notes: str = Field(default="", max_length=2000)


class AppointmentOut(OutModel):
    title: str
    provider: str
    specialty: str
    location: str
    starts_at: datetime
    duration_minutes: int
    notes: str


class NoteIn(InModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(default="", max_length=5000)
    tags: list[Tag] = Field(default_factory=list, max_length=20)


class NoteOut(OutModel):
    title: str
    body: str
    tags: list[str]


class HealthRecordIn(InModel):
    name: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=60)
    unit: str = Field(default="", max_length=40)
    recorded_on: date
    notes: str = Field(default="", max_length=1000)


class HealthRecordOut(OutModel):
    name: str
    value: str
    unit: str
    recorded_on: date
    notes: str
