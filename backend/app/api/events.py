from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.event import Event, EventRegistration
from app.core.auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: datetime
    end_date: Optional[datetime] = None
    max_participants: Optional[int] = None
    is_public: bool = True


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_participants: Optional[int] = None
    is_public: Optional[bool] = None


class MemberShort(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


class RegistrationResponse(BaseModel):
    id: int
    member_id: int
    status: str
    notes: Optional[str]
    registered_at: datetime
    member: Optional[MemberShort] = None

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    location: Optional[str]
    event_date: datetime
    end_date: Optional[datetime]
    max_participants: Optional[int]
    is_public: bool
    created_at: datetime
    registrations: List[RegistrationResponse] = []

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    member_id: int
    notes: Optional[str] = None


@router.get("", response_model=List[EventResponse])
async def list_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event)
        .where(Event.user_id == current_user.id)
        .options(selectinload(Event.registrations).selectinload(EventRegistration.member))
        .order_by(Event.event_date)
    )
    return result.scalars().all()


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(
    data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = Event(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        location=data.location,
        event_date=data.event_date,
        end_date=data.end_date,
        max_participants=data.max_participants,
        is_public=data.is_public,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    result = await db.execute(
        select(Event)
        .where(Event.id == event.id)
        .options(selectinload(Event.registrations).selectinload(EventRegistration.member))
    )
    return result.scalar_one()


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
        .options(selectinload(Event.registrations).selectinload(EventRegistration.member))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    result = await db.execute(
        select(Event).where(Event.id == event_id)
        .options(selectinload(Event.registrations).selectinload(EventRegistration.member))
    )
    return result.scalar_one()


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")
    await db.delete(event)
    await db.commit()


@router.post("/{event_id}/register", response_model=RegistrationResponse, status_code=201)
async def register_member(
    event_id: int,
    data: RegisterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check event belongs to user
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    # Check max_participants
    if event.max_participants:
        reg_result = await db.execute(
            select(EventRegistration).where(
                EventRegistration.event_id == event_id,
                EventRegistration.status == "registered",
            )
        )
        count = len(reg_result.scalars().all())
        if count >= event.max_participants:
            raise HTTPException(status_code=400, detail="Maximale Teilnehmerzahl erreicht")

    # Check member belongs to user
    member_result = await db.execute(
        select(Member).where(Member.id == data.member_id, Member.user_id == current_user.id)
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    # Check not already registered
    existing = await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == data.member_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mitglied bereits angemeldet")

    reg = EventRegistration(
        event_id=event_id,
        member_id=data.member_id,
        notes=data.notes,
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)

    result = await db.execute(
        select(EventRegistration).where(EventRegistration.id == reg.id)
        .options(selectinload(EventRegistration.member))
    )
    return result.scalar_one()


@router.delete("/{event_id}/register/{member_id}", status_code=204)
async def unregister_member(
    event_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check event belongs to user
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    reg_result = await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member_id,
        )
    )
    reg = reg_result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")

    await db.delete(reg)
    await db.commit()
