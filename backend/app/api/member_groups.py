from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.member_group import MemberGroup
from app.models.member import Member
from app.core.auth import get_current_user

router = APIRouter(prefix="/member-groups", tags=["member-groups"])


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    beitrag_override: Optional[float] = None
    color: Optional[str] = "#3b82f6"


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    beitrag_override: Optional[float] = None
    color: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    beitrag_override: Optional[float]
    color: Optional[str]
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[GroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MemberGroup)
        .where(MemberGroup.user_id == current_user.id)
        .options(selectinload(MemberGroup.members))
        .order_by(MemberGroup.name)
    )
    groups = result.scalars().all()
    return [
        GroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            beitrag_override=float(g.beitrag_override) if g.beitrag_override else None,
            color=g.color,
            member_count=len(g.members),
            created_at=g.created_at,
        )
        for g in groups
    ]


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = MemberGroup(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        beitrag_override=Decimal(str(data.beitrag_override)) if data.beitrag_override is not None else None,
        color=data.color or "#3b82f6",
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return GroupResponse(
        id=group.id, name=group.name, description=group.description,
        beitrag_override=float(group.beitrag_override) if group.beitrag_override else None,
        color=group.color, member_count=0, created_at=group.created_at,
    )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MemberGroup)
        .where(MemberGroup.id == group_id, MemberGroup.user_id == current_user.id)
        .options(selectinload(MemberGroup.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")

    if data.name is not None:
        group.name = data.name
    if data.description is not None:
        group.description = data.description
    if data.beitrag_override is not None:
        group.beitrag_override = Decimal(str(data.beitrag_override))
    if data.color is not None:
        group.color = data.color

    await db.commit()
    await db.refresh(group)
    return GroupResponse(
        id=group.id, name=group.name, description=group.description,
        beitrag_override=float(group.beitrag_override) if group.beitrag_override else None,
        color=group.color, member_count=len(group.members), created_at=group.created_at,
    )


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MemberGroup).where(MemberGroup.id == group_id, MemberGroup.user_id == current_user.id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    await db.delete(group)
    await db.commit()


@router.post("/{group_id}/members/{member_id}", status_code=204)
async def assign_member(
    group_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Assign a member to a group."""
    group_result = await db.execute(
        select(MemberGroup).where(MemberGroup.id == group_id, MemberGroup.user_id == current_user.id)
    )
    if not group_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")

    member_result = await db.execute(
        select(Member).where(Member.id == member_id, Member.user_id == current_user.id)
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    member.group_id = group_id
    await db.commit()


@router.delete("/{group_id}/members/{member_id}", status_code=204)
async def remove_member_from_group(
    group_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a group."""
    member_result = await db.execute(
        select(Member).where(
            Member.id == member_id,
            Member.user_id == current_user.id,
            Member.group_id == group_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht in dieser Gruppe")

    member.group_id = None
    await db.commit()
