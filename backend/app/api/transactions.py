from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal, InvalidOperation
from datetime import date, timedelta
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


@router.get("/template/csv")
async def download_transaction_template(
    current_user: User = Depends(get_current_user),
):
    """Download a CSV template for transaction import."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "type", "amount", "description", "category",
        "transaction_date", "receipt_number", "notes",
    ])
    writer.writerow(["income", "100.00", "Mitgliedsbeitrag Januar", "Mitgliedsbeiträge", "2024-01-15", "REC001", ""])
    writer.writerow(["expense", "45.50", "Büromaterial", "Material", "2024-01-20", "REC002", ""])
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="buchungen_vorlage.csv"'},
    )


@router.post("/import")
async def import_transactions_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import transactions from a CSV file."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Nur CSV-Dateien werden unterstützt.")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV-Datei ist leer oder ungültig.")

    required_fields = {"type", "amount", "description", "transaction_date"}
    fieldnames_lower = {f.strip().lower() for f in reader.fieldnames}
    missing = required_fields - fieldnames_lower
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Pflichtfelder fehlen: {', '.join(missing)}",
        )

    created = 0
    errors = []
    rows = list(reader)

    for row_num, row in enumerate(rows, start=2):
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

        # Validate type
        type_val = row.get("type", "").strip().lower()
        if type_val not in ("income", "expense", "einnahme", "ausgabe"):
            errors.append({"row": row_num, "error": f"Ungültiger Typ '{type_val}'. Erlaubt: income, expense."})
            continue
        if type_val == "einnahme":
            type_val = "income"
        elif type_val == "ausgabe":
            type_val = "expense"

        # Validate amount
        raw_amount = row.get("amount", "").strip()
        try:
            amount = Decimal(raw_amount.replace(",", "."))
            if amount <= 0:
                raise ValueError
        except (InvalidOperation, ValueError):
            errors.append({"row": row_num, "error": f"Ungültiger Betrag '{raw_amount}'."})
            continue

        # Validate description
        description = row.get("description", "").strip()
        if not description:
            errors.append({"row": row_num, "error": "Beschreibung ist ein Pflichtfeld."})
            continue

        # Parse date
        raw_date = row.get("transaction_date", "").strip()
        transaction_date: date | None = None
        for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
            try:
                transaction_date = date.fromisoformat(raw_date) if fmt == "%Y-%m-%d" else date.strptime(raw_date, fmt).date()
                break
            except ValueError:
                continue
        if transaction_date is None:
            errors.append({"row": row_num, "error": f"Ungültiges Datum '{raw_date}'. Verwenden Sie YYYY-MM-DD oder DD.MM.YYYY."})
            continue

        transaction = Transaction(
            user_id=current_user.id,
            type=type_val,
            amount=amount,
            description=description,
            category=row.get("category") or None,
            transaction_date=transaction_date,
            receipt_number=row.get("receipt_number") or None,
            notes=row.get("notes") or None,
        )
        db.add(transaction)
        created += 1

    if created > 0:
        await db.commit()

    return {
        "success": True,
        "total": len(rows),
        "created": created,
        "skipped": len(errors),
        "errors": errors,
    }


@router.get("/monthly-chart")
async def get_monthly_chart(
    months: int = Query(default=6, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns monthly income/expense totals for the last N months."""
    today = date.today()
    result = []

    for i in range(months - 1, -1, -1):
        # Calculate month start by going back i months
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        month_start = date(year, month, 1)
        # Month end: first day of next month minus one day
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)

        income_result = await db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == current_user.id,
                Transaction.type == "income",
                Transaction.transaction_date >= month_start,
                Transaction.transaction_date <= month_end,
            )
        )
        expense_result = await db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.transaction_date >= month_start,
                Transaction.transaction_date <= month_end,
            )
        )

        month_names = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
        result.append({
            "month": month_names[month - 1],
            "year": year,
            "income": float(income_result.scalar() or 0),
            "expense": float(expense_result.scalar() or 0),
        })

    return result
