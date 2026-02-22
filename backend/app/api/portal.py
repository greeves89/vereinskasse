"""Public member self-service portal (no auth required, token-based)."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import date
import secrets

from app.database import get_db
from app.models.member import Member
from app.models.transaction import Transaction
from app.models.event import Event
from app.models.document import VereinsDocument
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter(prefix="/portal", tags=["portal"])


@router.get("/{token}", response_model=dict)
async def get_portal_data(token: str, db: AsyncSession = Depends(get_db)):
    """Public endpoint: returns member data for the given portal token."""
    result = await db.execute(select(Member).where(Member.portal_token == token))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Ungültiger oder abgelaufener Zugangslink")

    # Load owner/organization info
    user_result = await db.execute(select(User).where(User.id == member.user_id))
    user = user_result.scalar_one_or_none()

    # Load transactions for this member (last 20, newest first)
    tx_result = await db.execute(
        select(Transaction)
        .where(Transaction.member_id == member.id)
        .order_by(Transaction.transaction_date.desc())
        .limit(20)
    )
    transactions = tx_result.scalars().all()

    # Load upcoming events (today and future)
    event_result = await db.execute(
        select(Event)
        .where(
            Event.user_id == member.user_id,
            Event.event_date >= date.today(),
        )
        .order_by(Event.event_date)
        .limit(5)
    )
    events = event_result.scalars().all()

    # Load public documents (non-intern categories)
    doc_result = await db.execute(
        select(VereinsDocument)
        .where(
            VereinsDocument.user_id == member.user_id,
            VereinsDocument.category != "intern",
        )
        .order_by(VereinsDocument.created_at.desc())
        .limit(10)
    )
    documents = doc_result.scalars().all()

    return {
        "member": {
            "member_id": member.id,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "email": member.email,
            "phone": member.phone,
            "member_since": str(member.member_since) if member.member_since else None,
            "member_number": member.member_number,
            "status": member.status,
            "beitrag_monthly": float(member.beitrag_monthly) if member.beitrag_monthly else None,
            "organization_name": user.organization_name if user else None,
        },
        "transactions": [
            {
                "transaction_date": str(t.transaction_date),
                "description": t.description,
                "amount": float(t.amount),
                "type": t.type,
            }
            for t in transactions
        ],
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "event_date": str(e.event_date),
                "location": e.location,
                "description": e.description,
            }
            for e in events
        ],
        "documents": [
            {
                "id": d.id,
                "title": d.title,
                "original_filename": d.original_filename,
                "category": d.category,
                "file_size": d.file_size,
                "created_at": str(d.created_at),
            }
            for d in documents
        ],
    }


@router.post("/generate-token/{member_id}", response_model=dict)
async def generate_portal_token(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Authenticated: generate or regenerate a portal token for a member."""
    result = await db.execute(
        select(Member).where(Member.id == member_id, Member.user_id == current_user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    token = secrets.token_urlsafe(32)
    member.portal_token = token
    await db.commit()
    return {"token": token, "member_id": member_id}
