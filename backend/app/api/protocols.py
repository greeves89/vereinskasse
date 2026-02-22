from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.protocol import Protocol
from app.core.auth import get_current_user

router = APIRouter(prefix="/protocols", tags=["protocols"])


class AgendaItem(BaseModel):
    title: str
    description: Optional[str] = None
    result: Optional[str] = None


class Resolution(BaseModel):
    text: str
    votes_yes: Optional[int] = None
    votes_no: Optional[int] = None
    votes_abstain: Optional[int] = None
    passed: Optional[bool] = None


class ProtocolCreate(BaseModel):
    title: str
    protocol_type: str = "vorstand"
    meeting_date: datetime
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    agenda_items: Optional[List[dict]] = None
    resolutions: Optional[List[dict]] = None
    notes: Optional[str] = None
    status: str = "draft"


class ProtocolUpdate(BaseModel):
    title: Optional[str] = None
    protocol_type: Optional[str] = None
    meeting_date: Optional[datetime] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    agenda_items: Optional[List[dict]] = None
    resolutions: Optional[List[dict]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ProtocolResponse(BaseModel):
    id: int
    title: str
    protocol_type: str
    meeting_date: datetime
    location: Optional[str]
    attendees: Optional[List[str]]
    agenda_items: Optional[List[dict]]
    resolutions: Optional[List[dict]]
    notes: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[ProtocolResponse])
async def list_protocols(
    protocol_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Protocol).where(Protocol.user_id == current_user.id)
    if protocol_type:
        query = query.where(Protocol.protocol_type == protocol_type)
    if status:
        query = query.where(Protocol.status == status)
    query = query.order_by(Protocol.meeting_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProtocolResponse, status_code=201)
async def create_protocol(
    data: ProtocolCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    protocol = Protocol(
        user_id=current_user.id,
        title=data.title,
        protocol_type=data.protocol_type,
        meeting_date=data.meeting_date,
        location=data.location,
        attendees=data.attendees or [],
        agenda_items=data.agenda_items or [],
        resolutions=data.resolutions or [],
        notes=data.notes,
        status=data.status,
    )
    db.add(protocol)
    await db.commit()
    await db.refresh(protocol)
    return protocol


@router.get("/{protocol_id}", response_model=ProtocolResponse)
async def get_protocol(
    protocol_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol).where(Protocol.id == protocol_id, Protocol.user_id == current_user.id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status_code=404, detail="Protokoll nicht gefunden")
    return protocol


@router.put("/{protocol_id}", response_model=ProtocolResponse)
async def update_protocol(
    protocol_id: int,
    data: ProtocolUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol).where(Protocol.id == protocol_id, Protocol.user_id == current_user.id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status_code=404, detail="Protokoll nicht gefunden")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(protocol, field, value)

    await db.commit()
    await db.refresh(protocol)
    return protocol


@router.delete("/{protocol_id}", status_code=204)
async def delete_protocol(
    protocol_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Protocol).where(Protocol.id == protocol_id, Protocol.user_id == current_user.id)
    )
    protocol = result.scalar_one_or_none()
    if not protocol:
        raise HTTPException(status_code=404, detail="Protokoll nicht gefunden")
    await db.delete(protocol)
    await db.commit()
