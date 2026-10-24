"""Generic user-scoped CRUD routes.

Every query is filtered by the calling user's id, so one user can never read or change another
user's records. Records owned by someone else are reported as 404, not 403, to avoid revealing
that they exist.
"""

import uuid
from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import Date, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import InstrumentedAttribute, Session

from .auth import CurrentUser, DbSession
from .db import Base
from .models import User

# Checks references in a payload (e.g. recipe_id) belong to the user; raises HTTPException if not.
Validator = Callable[[Session, User, BaseModel], None]


def owned_or_404[M: Base](session: Session, model: type[M], user: User, record_id: uuid.UUID) -> M:
    record = session.scalar(select(model).where(model.id == record_id, model.user_id == user.id))
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found.")
    return record


def require_owned(model: type[Base], field: str) -> Validator:
    """Validator: the id in `payload.<field>` (if set) must refer to the user's own record."""

    def check(session: Session, user: User, payload: BaseModel) -> None:
        ref = getattr(payload, field)
        if ref is None:
            return
        exists = session.scalar(select(model.id).where(model.id == ref, model.user_id == user.id))
        if exists is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, f"{field} does not refer to your data."
            )

    return check


def _parse_bound(value: str, column: InstrumentedAttribute[Any], name: str) -> date | datetime:
    """Parse a since/until filter into the column's type; invalid input is a 422, not a 500."""
    try:
        if isinstance(column.type, Date):
            return date.fromisoformat(value[:10])
        parsed = datetime.fromisoformat(value)
    except ValueError as e:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"{name} must be an ISO date or date-time."
        ) from e
    # Date-only or naive values are interpreted as UTC.
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A record with these identifiers already exists."
        ) from e


def crud_router(
    *,
    model: type[Base],
    schema_in: type[BaseModel],
    schema_out: type[BaseModel],
    path: str,
    order_by: InstrumentedAttribute[Any],
    time_column: InstrumentedAttribute[Any] | None = None,
    validators: tuple[Validator, ...] = (),
    tag: str,
) -> APIRouter:
    router = APIRouter(prefix=path, tags=[tag])
    name = model.__name__

    if time_column is not None:

        @router.get("", response_model=list[schema_out], summary=f"List {name} records")
        def list_records_in_range(
            user: CurrentUser,
            session: DbSession,
            since: str | None = Query(default=None, description="ISO date/time, inclusive"),
            until: str | None = Query(default=None, description="ISO date/time, exclusive"),
            limit: int = Query(default=500, ge=1, le=5000),
            offset: int = Query(default=0, ge=0),
        ) -> Any:
            stmt = select(model).where(model.user_id == user.id)
            if since:
                stmt = stmt.where(time_column >= _parse_bound(since, time_column, "since"))
            if until:
                stmt = stmt.where(time_column < _parse_bound(until, time_column, "until"))
            return session.scalars(stmt.order_by(order_by).limit(limit).offset(offset)).all()

    else:

        @router.get("", response_model=list[schema_out], summary=f"List {name} records")
        def list_records(
            user: CurrentUser,
            session: DbSession,
            limit: int = Query(default=500, ge=1, le=5000),
            offset: int = Query(default=0, ge=0),
        ) -> Any:
            stmt = select(model).where(model.user_id == user.id).order_by(order_by)
            return session.scalars(stmt.limit(limit).offset(offset)).all()

    @router.post("", response_model=schema_out, status_code=status.HTTP_201_CREATED, summary=f"Create {name}")
    def create_record(payload: schema_in, user: CurrentUser, session: DbSession) -> Any:  # type: ignore[valid-type]
        for check in validators:
            check(session, user, payload)
        record = model(**payload.model_dump(), user_id=user.id)
        session.add(record)
        _commit(session)
        session.refresh(record)
        return record

    @router.get("/{record_id}", response_model=schema_out, summary=f"Get {name}")
    def get_record(record_id: uuid.UUID, user: CurrentUser, session: DbSession) -> Any:
        return owned_or_404(session, model, user, record_id)

    @router.put("/{record_id}", response_model=schema_out, summary=f"Replace {name}")
    def replace_record(
        record_id: uuid.UUID, payload: schema_in, user: CurrentUser, session: DbSession
    ) -> Any:  # type: ignore[valid-type]
        record = owned_or_404(session, model, user, record_id)
        for check in validators:
            check(session, user, payload)
        for key, value in payload.model_dump().items():
            setattr(record, key, value)
        _commit(session)
        session.refresh(record)
        return record

    @router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT, summary=f"Delete {name}")
    def delete_record(record_id: uuid.UUID, user: CurrentUser, session: DbSession) -> Response:
        session.delete(owned_or_404(session, model, user, record_id))
        session.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
