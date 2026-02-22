from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from decimal import Decimal, InvalidOperation
from datetime import date
import csv
import io
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


@router.get("/template/csv")
async def download_member_template(
    current_user: User = Depends(get_current_user),
):
    """Download a CSV template for member import."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "first_name", "last_name", "email", "phone",
        "member_since", "member_number", "status",
        "beitrag_monthly", "iban", "notes",
    ])
    writer.writerow([
        "Max", "Mustermann", "max@beispiel.de", "+49123456789",
        "2023-01-15", "M001", "active", "50.00",
        "DE89370400440532013000", "Beispiel-Notiz",
    ])
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="mitglieder_vorlage.csv"'},
    )


@router.post("/import")
async def import_members_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import members from a CSV file."""
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

    required_fields = {"first_name", "last_name"}
    fieldnames_lower = {f.strip().lower() for f in reader.fieldnames}
    missing = required_fields - fieldnames_lower
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Pflichtfelder fehlen: {', '.join(missing)}",
        )

    # Check current member count for free tier limit enforcement
    if not current_user.is_premium and not current_user.is_admin:
        count_result = await db.execute(
            select(func.count(Member.id)).where(Member.user_id == current_user.id)
        )
        existing_count = count_result.scalar() or 0
    else:
        existing_count = 0

    created = 0
    errors = []
    rows = list(reader)

    for row_num, row in enumerate(rows, start=2):
        # Normalize keys
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

        first_name = row.get("first_name", "").strip()
        last_name = row.get("last_name", "").strip()

        if not first_name or not last_name:
            errors.append({"row": row_num, "error": "Vorname und Nachname sind Pflichtfelder."})
            continue

        # Check free tier limit
        if not current_user.is_premium and not current_user.is_admin:
            if existing_count + created >= settings.FREE_MEMBER_LIMIT:
                errors.append({"row": row_num, "error": f"Kostenloses Paket: Limit von {settings.FREE_MEMBER_LIMIT} Mitgliedern erreicht."})
                continue

        # Parse optional date
        member_since: date | None = None
        raw_date = row.get("member_since", "").strip()
        if raw_date:
            for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
                try:
                    member_since = date.fromisoformat(raw_date) if fmt == "%Y-%m-%d" else date.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            if member_since is None:
                errors.append({"row": row_num, "error": f"Ungültiges Datum '{raw_date}'. Verwenden Sie YYYY-MM-DD oder DD.MM.YYYY."})
                continue

        # Parse optional decimal
        beitrag_monthly: Decimal | None = None
        raw_beitrag = row.get("beitrag_monthly", "").strip()
        if raw_beitrag:
            try:
                beitrag_monthly = Decimal(raw_beitrag.replace(",", "."))
            except InvalidOperation:
                errors.append({"row": row_num, "error": f"Ungültiger Betrag '{raw_beitrag}'."})
                continue

        # Validate status
        status_val = row.get("status", "active").strip() or "active"
        if status_val not in ("active", "inactive", "suspended"):
            status_val = "active"

        member = Member(
            user_id=current_user.id,
            first_name=first_name,
            last_name=last_name,
            email=row.get("email") or None,
            phone=row.get("phone") or None,
            member_since=member_since,
            member_number=row.get("member_number") or None,
            status=status_val,
            beitrag_monthly=beitrag_monthly,
            iban=row.get("iban") or None,
            notes=row.get("notes") or None,
        )
        db.add(member)
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
