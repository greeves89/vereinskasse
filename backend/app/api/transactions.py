from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from datetime import date
import csv
import io

from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate, TransactionRead, TransactionUpdate,
    CategoryCreate, CategoryRead, CategoryUpdate, TransactionStats,
)
from app.models.category import Category
from app.core.auth import get_current_user, get_premium_user
from app.services.pdf_service import generate_jahresabschluss_pdf

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionRead])
async def list_transactions(
    type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Transaction).where(Transaction.user_id == current_user.id)
    if type:
        query = query.where(Transaction.type == type)
    if category:
        query = query.where(Transaction.category == category)
    if date_from:
        query = query.where(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.where(Transaction.transaction_date <= date_to)
    query = query.order_by(Transaction.transaction_date.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    transaction = Transaction(user_id=current_user.id, **transaction_data.model_dump())
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.get("/stats", response_model=TransactionStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    month_start = date(today.year, today.month, 1)

    # Total stats
    income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
    )
    expense_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
        )
    )
    month_income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.transaction_date >= month_start,
        )
    )
    month_expense_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= month_start,
        )
    )
    count_result = await db.execute(
        select(func.count(Transaction.id)).where(Transaction.user_id == current_user.id)
    )

    total_income = income_result.scalar() or Decimal("0")
    total_expense = expense_result.scalar() or Decimal("0")

    return TransactionStats(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        month_income=month_income_result.scalar() or Decimal("0"),
        month_expense=month_expense_result.scalar() or Decimal("0"),
        transaction_count=count_result.scalar() or 0,
    )


@router.get("/{transaction_id}", response_model=TransactionRead)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    transaction_id: int,
    update_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(transaction, key, value)

    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    await db.delete(transaction)
    await db.commit()


@router.get("/export/datev")
async def export_datev(
    year: int = Query(default=None),
    current_user: User = Depends(get_premium_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Transaction).where(Transaction.user_id == current_user.id)
    if year:
        query = query.where(
            Transaction.transaction_date >= date(year, 1, 1),
            Transaction.transaction_date <= date(year, 12, 31),
        )
    query = query.order_by(Transaction.transaction_date)
    result = await db.execute(query)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL)
    writer.writerow(["Datum", "Belegnummer", "Buchungstext", "Betrag", "Soll/Haben", "Kategorie", "Notiz"])
    for t in transactions:
        writer.writerow([
            t.transaction_date.strftime("%d.%m.%Y"),
            t.receipt_number or "",
            t.description,
            str(t.amount).replace(".", ","),
            "H" if t.type == "income" else "S",
            t.category or "",
            t.notes or "",
        ])

    csv_content = output.getvalue()
    filename = f"datev_export_{year or 'all'}.csv"
    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/jahresabschluss")
async def export_jahresabschluss(
    year: int = Query(...),
    current_user: User = Depends(get_premium_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Transaction).where(
        Transaction.user_id == current_user.id,
        Transaction.transaction_date >= date(year, 1, 1),
        Transaction.transaction_date <= date(year, 12, 31),
    ).order_by(Transaction.transaction_date)
    result = await db.execute(query)
    transactions = result.scalars().all()

    income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.transaction_date >= date(year, 1, 1),
            Transaction.transaction_date <= date(year, 12, 31),
        )
    )
    expense_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= date(year, 1, 1),
            Transaction.transaction_date <= date(year, 12, 31),
        )
    )

    total_income = float(income_result.scalar() or 0)
    total_expense = float(expense_result.scalar() or 0)

    transaction_list = [
        {
            "transaction_date": str(t.transaction_date),
            "description": t.description,
            "category": t.category or "",
            "type": t.type,
            "amount": float(t.amount),
        }
        for t in transactions
    ]

    pdf_bytes = generate_jahresabschluss_pdf(
        organization_name=current_user.organization_name or current_user.name,
        year=year,
        transactions=transaction_list,
        summary={
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": total_income - total_expense,
            "count": len(transactions),
        },
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="jahresabschluss_{year}.pdf"'},
    )
