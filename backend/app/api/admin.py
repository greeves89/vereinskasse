from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.transaction import Transaction
from app.models.feedback import Feedback
from app.schemas.user import UserRead, AdminUserUpdate
from app.schemas.feedback import FeedbackRead, FeedbackUpdate
from app.core.auth import get_admin_user
from app.services.email_service import send_email, build_feedback_response_email

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_system_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user_count = await db.execute(select(func.count(User.id)))
    premium_count = await db.execute(select(func.count(User.id)).where(User.subscription_tier == "premium"))
    member_count = await db.execute(select(func.count(Member.id)))
    transaction_count = await db.execute(select(func.count(Transaction.id)))
    feedback_count = await db.execute(select(func.count(Feedback.id)).where(Feedback.status == "pending"))

    return {
        "total_users": user_count.scalar(),
        "premium_users": premium_count.scalar(),
        "total_members": member_count.scalar(),
        "total_transactions": transaction_count.scalar(),
        "pending_feedback": feedback_count.scalar(),
    }


@router.get("/users", response_model=List[UserRead])
async def list_users(
    search: Optional[str] = Query(default=None),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.email.ilike(search_term)) |
            (User.name.ilike(search_term)) |
            (User.organization_name.ilike(search_term))
        )
    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return user


@router.put("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    update_data: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst löschen")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    await db.delete(user)
    await db.commit()


@router.get("/feedback", response_model=List[FeedbackRead])
async def list_all_feedback(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Feedback)
    if status_filter:
        query = query.where(Feedback.status == status_filter)
    query = query.order_by(Feedback.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/feedback/{feedback_id}", response_model=FeedbackRead)
async def update_feedback_status(
    feedback_id: int,
    update_data: FeedbackUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback nicht gefunden")

    old_status = feedback.status
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(feedback, key, value)

    await db.commit()
    await db.refresh(feedback)

    # Notify user if admin responded and status changed
    if update_data.admin_response and feedback.status in ["approved", "rejected", "in_review"]:
        user_result = await db.execute(select(User).where(User.id == feedback.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            try:
                html, text = build_feedback_response_email(
                    user_name=user.name,
                    feedback_title=feedback.title,
                    feedback_type=feedback.type,
                    admin_response=update_data.admin_response,
                    status=feedback.status,
                )
                await send_email(
                    db, user.email,
                    f"Antwort auf Ihr Feedback: {feedback.title}",
                    html, text,
                )
            except Exception:
                pass

    return feedback


# ─────────────────────────────────────────────
# Audit Log
# ─────────────────────────────────────────────
from pydantic import BaseModel as _BaseModel
from app.models.audit_log import AuditLog


class AuditLogResponse(_BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    resource: str
    resource_id: Optional[int]
    detail: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/audit-log", response_model=List[AuditLogResponse])
async def list_audit_log(
    resource: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if resource:
        query = query.where(AuditLog.resource == resource)
    if action:
        query = query.where(AuditLog.action == action)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()
