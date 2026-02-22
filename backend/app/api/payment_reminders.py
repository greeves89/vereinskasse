from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone, date
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.payment_reminder import PaymentReminder
from app.schemas.payment_reminder import (
    PaymentReminderCreate, PaymentReminderRead, PaymentReminderUpdate,
)
from app.core.auth import get_current_user
from app.services.email_service import send_email, build_payment_reminder_email

router = APIRouter(tags=["payment-reminders"])


async def _get_member_or_404(member_id: int, user_id: int, db: AsyncSession) -> Member:
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    return member


@router.get("/members/{member_id}/reminders", response_model=List[PaymentReminderRead])
async def list_reminders(
    member_id: int,
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member_or_404(member_id, current_user.id, db)
    query = select(PaymentReminder).where(PaymentReminder.member_id == member_id)
    if status:
        query = query.where(PaymentReminder.status == status)
    query = query.order_by(PaymentReminder.due_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/members/{member_id}/reminders", response_model=PaymentReminderRead, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    member_id: int,
    data: PaymentReminderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member_or_404(member_id, current_user.id, db)
    reminder = PaymentReminder(member_id=member_id, **data.model_dump())
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.put("/members/{member_id}/reminders/{reminder_id}", response_model=PaymentReminderRead)
async def update_reminder(
    member_id: int,
    reminder_id: int,
    data: PaymentReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member_or_404(member_id, current_user.id, db)
    result = await db.execute(
        select(PaymentReminder).where(
            PaymentReminder.id == reminder_id,
            PaymentReminder.member_id == member_id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Erinnerung nicht gefunden")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(reminder, key, value)

    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/members/{member_id}/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    member_id: int,
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_member_or_404(member_id, current_user.id, db)
    result = await db.execute(
        select(PaymentReminder).where(
            PaymentReminder.id == reminder_id,
            PaymentReminder.member_id == member_id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Erinnerung nicht gefunden")
    await db.delete(reminder)
    await db.commit()


@router.post("/members/{member_id}/reminders/{reminder_id}/send", response_model=PaymentReminderRead)
async def send_reminder(
    member_id: int,
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_member_or_404(member_id, current_user.id, db)

    if not member.email:
        raise HTTPException(
            status_code=400,
            detail="Mitglied hat keine E-Mail-Adresse hinterlegt",
        )

    result = await db.execute(
        select(PaymentReminder).where(
            PaymentReminder.id == reminder_id,
            PaymentReminder.member_id == member_id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Erinnerung nicht gefunden")

    organization = current_user.organization_name or current_user.name
    due_date_str = reminder.due_date.strftime("%d.%m.%Y")

    html, text = build_payment_reminder_email(
        member_name=member.full_name,
        organization=organization,
        amount=float(reminder.amount),
        due_date=due_date_str,
        notes=reminder.notes,
    )

    success = await send_email(
        db,
        recipient=member.email,
        subject=f"Zahlungserinnerung – {organization}",
        html_body=html,
        text_body=text,
    )

    if not success:
        raise HTTPException(status_code=500, detail="E-Mail konnte nicht gesendet werden")

    reminder.sent_at = datetime.now(timezone.utc)
    reminder.status = "sent"
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("/members/payment-overview", response_model=List[dict])
async def payment_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all active members with their outstanding payment reminder counts and total due."""
    members_result = await db.execute(
        select(Member).where(
            Member.user_id == current_user.id,
            Member.status == "active",
        ).order_by(Member.last_name, Member.first_name)
    )
    members = members_result.scalars().all()

    today = date.today()
    overview = []
    for m in members:
        reminders_result = await db.execute(
            select(PaymentReminder).where(
                PaymentReminder.member_id == m.id,
                PaymentReminder.status.in_(["pending", "sent", "overdue"]),
            )
        )
        reminders = reminders_result.scalars().all()

        # Mark overdue
        for r in reminders:
            if r.due_date < today and r.status != "overdue":
                r.status = "overdue"

        if any(r.status != "overdue" or r.due_date < today for r in reminders):
            await db.commit()

        total_due = sum(float(r.amount) for r in reminders)
        overdue_count = sum(1 for r in reminders if r.due_date < today)

        overview.append({
            "member_id": m.id,
            "member_name": m.full_name,
            "email": m.email,
            "beitrag_monthly": float(m.beitrag_monthly) if m.beitrag_monthly else None,
            "open_reminders": len(reminders),
            "overdue_count": overdue_count,
            "total_due": total_due,
        })

    return overview
