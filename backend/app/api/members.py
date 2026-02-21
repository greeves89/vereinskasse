from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberRead, MemberUpdate
from app.core.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=List[MemberRead])
async def list_members(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Member).where(Member.user_id == current_user.id)
    if status:
        query = query.where(Member.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Member.first_name.ilike(search_term)) |
            (Member.last_name.ilike(search_term)) |
            (Member.email.ilike(search_term)) |
            (Member.member_number.ilike(search_term))
        )
    query = query.order_by(Member.last_name, Member.first_name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=MemberRead, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_data: MemberCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check member limit for free tier
    if not current_user.is_premium and not current_user.is_admin:
        count_result = await db.execute(
            select(func.count(Member.id)).where(Member.user_id == current_user.id)
        )
        member_count = count_result.scalar()
        if member_count >= settings.FREE_MEMBER_LIMIT:
            raise HTTPException(
                status_code=402,
                detail=f"Kostenloses Paket: Maximal {settings.FREE_MEMBER_LIMIT} Mitglieder. Upgrade auf Premium für unlimitierte Mitglieder.",
            )

    member = Member(user_id=current_user.id, **member_data.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.get("/{member_id}", response_model=MemberRead)
async def get_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.user_id == current_user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    return member


@router.put("/{member_id}", response_model=MemberRead)
async def update_member(
    member_id: int,
    update_data: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.user_id == current_user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(member, key, value)

    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.user_id == current_user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    await db.delete(member)
    await db.commit()


@router.get("/count/stats")
async def get_member_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(
        select(func.count(Member.id)).where(Member.user_id == current_user.id)
    )
    active_result = await db.execute(
        select(func.count(Member.id)).where(Member.user_id == current_user.id, Member.status == "active")
    )
    return {
        "total": total_result.scalar(),
        "active": active_result.scalar(),
        "limit": settings.FREE_MEMBER_LIMIT if not current_user.is_premium else None,
        "is_premium": current_user.is_premium,
    }
