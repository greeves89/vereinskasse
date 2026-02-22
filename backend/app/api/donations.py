"""
Zuwendungsbestätigungen (Spendenquittungen) nach amtlichem Muster.
Ermöglicht das Ausstellen von steuerlich absetzbaren Zuwendungsbestätigungen
für Mitgliedsbeiträge und Spenden an gemeinnützige Vereine.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.transaction import Transaction
from app.core.auth import get_current_user
from app.services.pdf_service import generate_zuwendungsbestaetigung_pdf

router = APIRouter(prefix="/donations", tags=["donations"])


@router.get("/receipt/{member_id}")
async def generate_receipt(
    member_id: int,
    year: int = Query(..., description="Abrechnungsjahr für die Zuwendungsbestätigung"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Erstellt eine Zuwendungsbestätigung (Spendenquittung) nach amtlichem Muster
    für alle Mitgliedsbeiträge und Spenden eines Mitglieds in einem Kalenderjahr.
    """
    # Load member
    member_result = await db.execute(
        select(Member).where(
            Member.id == member_id,
            Member.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    if not member.email and not member.first_name:
        raise HTTPException(status_code=400, detail="Mitglied hat keine vollständigen Angaben")

    # Load all income transactions for this member in the given year
    transactions_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.member_id == member_id,
                Transaction.type == "income",
                func.extract("year", Transaction.transaction_date) == year,
            )
        ).order_by(Transaction.transaction_date)
    )
    transactions = transactions_result.scalars().all()

    if not transactions:
        raise HTTPException(
            status_code=404,
            detail=f"Keine Einnahmen für {member.full_name} im Jahr {year} gefunden.",
        )

    total_amount = sum(t.amount for t in transactions)

    # Build transaction list for PDF
    tx_list = [
        {
            "date": t.transaction_date,
            "description": t.description,
            "amount": float(t.amount),
        }
        for t in transactions
    ]

    # Generate PDF
    org_name = current_user.organization_name or current_user.name or "Unbekannter Verein"
    pdf_bytes = generate_zuwendungsbestaetigung_pdf(
        organization_name=org_name,
        member_name=member.full_name,
        member_address=None,  # Address not stored — space left in PDF
        year=year,
        total_amount=float(total_amount),
        transactions=tx_list,
        issue_date=date.today(),
    )

    filename = f"zuwendungsbestaetigung_{member.last_name}_{year}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary/{member_id}")
async def get_donation_summary(
    member_id: int,
    year: int = Query(..., description="Abrechnungsjahr"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Gibt eine Zusammenfassung aller Zahlungen eines Mitglieds für ein Jahr zurück.
    """
    member_result = await db.execute(
        select(Member).where(
            Member.id == member_id,
            Member.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")

    transactions_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.user_id == current_user.id,
                Transaction.member_id == member_id,
                Transaction.type == "income",
                func.extract("year", Transaction.transaction_date) == year,
            )
        ).order_by(Transaction.transaction_date)
    )
    transactions = transactions_result.scalars().all()

    total = sum(t.amount for t in transactions)

    return {
        "member_id": member_id,
        "member_name": member.full_name,
        "year": year,
        "total_amount": float(total),
        "transaction_count": len(transactions),
        "transactions": [
            {
                "date": str(t.transaction_date),
                "description": t.description,
                "amount": float(t.amount),
            }
            for t in transactions
        ],
    }
