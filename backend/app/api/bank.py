"""
Bankabgleich: Kontoauszug-Import (CSV) für VereinsKasse.

Importiert Bankbuchungen und:
1. Erkennt Mitgliedsbeiträge anhand IBAN-Vergleich
2. Ordnet Zahlungen automatisch Mitgliedern zu
3. Kann importierte Buchungen als Kassenbuch-Transaktionen übernehmen

Unterstützte CSV-Formate: DKB, Sparkasse, VR-Bank, Comdirect, generisch.
"""
import csv
import io
import re
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.transaction import Transaction
from app.core.auth import get_current_user

router = APIRouter(prefix="/bank", tags=["bank"])


# ── Pydantic ──────────────────────────────────────────────────────────────────

class BankTxnOut(BaseModel):
    booking_date: str
    counterparty: Optional[str]
    iban: Optional[str]
    purpose: Optional[str]
    amount: float
    currency: str
    matched_member_id: Optional[int]
    matched_member_name: Optional[str]
    match_type: Optional[str]   # "iban" | "name" | None
    transaction_created: bool   # True if added to Kassenbuch already


class ImportResult(BaseModel):
    imported: int
    member_matches: int
    kassenbuch_added: int
    skipped: int
    transactions: list[BankTxnOut]


class AcceptRequest(BaseModel):
    """Accept a bank transaction into the Kassenbuch."""
    booking_date: str
    amount: float
    description: str
    member_id: Optional[int] = None
    category_id: Optional[int] = None
    txn_type: str = "income"  # "income" | "expense"


# ── CSV Parsing (shared logic, same as HB version) ────────────────────────────

def _parse_german_decimal(value: str) -> Optional[Decimal]:
    if not value:
        return None
    v = value.strip().replace("\xa0", "").replace(" ", "")
    v = re.sub(r"[€$£]", "", v)
    if re.match(r"^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$", v):
        v = v.replace(".", "").replace(",", ".")
    elif "," in v and "." not in v:
        v = v.replace(",", ".")
    elif "," in v and "." in v and v.index(",") > v.index("."):
        v = v.replace(",", "")
    elif "," in v:
        v = v.replace(".", "").replace(",", ".")
    try:
        return Decimal(v)
    except InvalidOperation:
        return None


def _parse_date(value: str) -> Optional[date]:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            from datetime import datetime
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _detect_columns(header: list[str]) -> dict:
    h = [c.lower().strip() for c in header]

    def find(*candidates) -> Optional[int]:
        for cand in candidates:
            for i, col in enumerate(h):
                if cand in col:
                    return i
        return None

    return {
        "date": find("buchungstag", "buchungsdatum", "datum", "date", "valuta"),
        "value_date": find("wertstellung", "valutadatum"),
        "counterparty": find("auftraggeber", "empfänger", "beguenstigter", "begünstigter", "name", "zahlungsempfänger"),
        "iban": find("iban", "konto", "account"),
        "purpose": find("verwendungszweck", "buchungstext", "purpose", "betreff", "reference"),
        "amount": find("betrag", "amount", "umsatz"),
        "currency": find("währung", "currency"),
        "debit": find("soll", "debit", "ausgabe", "belastung"),
        "credit": find("haben", "credit", "eingang", "gutschrift"),
    }


def _parse_csv(content: bytes) -> list[dict]:
    text = None
    for enc in ("utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("CSV-Datei konnte nicht gelesen werden.")

    lines = text.splitlines()
    start_idx = 0
    for i, line in enumerate(lines):
        if re.search(r"(buchungstag|datum|date|buchung)", line, re.IGNORECASE):
            start_idx = i
            break

    try:
        dialect = csv.Sniffer().sniff(lines[start_idx], delimiters=";,\t")
    except csv.Error:
        dialect = csv.excel
        dialect.delimiter = ";"

    reader = csv.reader(lines[start_idx:], dialect=dialect)
    rows = list(reader)
    if not rows:
        return []

    header = rows[0]
    cols = _detect_columns(header)
    transactions = []

    for row in rows[1:]:
        if not row or all(cell.strip() == "" for cell in row):
            continue
        max_idx = max((c for c in cols.values() if c is not None), default=0)
        if len(row) <= max_idx:
            continue

        def get(idx: Optional[int]) -> str:
            if idx is None or idx >= len(row):
                return ""
            return row[idx].strip()

        booking_date = _parse_date(get(cols["date"]))
        if booking_date is None:
            continue

        amount: Optional[Decimal] = None
        if cols["amount"] is not None:
            raw = get(cols["amount"]).replace("+", "").strip()
            amount = _parse_german_decimal(raw)

        if amount is None and cols["debit"] is not None and cols["credit"] is not None:
            debit = _parse_german_decimal(get(cols["debit"]))
            credit = _parse_german_decimal(get(cols["credit"]))
            if credit and credit > 0:
                amount = credit
            elif debit and debit > 0:
                amount = -debit

        if amount is None:
            continue

        # Normalize IBAN
        raw_iban = re.sub(r"\s", "", get(cols["iban"]))
        iban = raw_iban if re.match(r"^[A-Z]{2}\d{2}", raw_iban) else None

        transactions.append({
            "booking_date": booking_date,
            "counterparty": get(cols["counterparty"]) or None,
            "iban": iban,
            "purpose": get(cols["purpose"]) or None,
            "amount": amount,
            "currency": get(cols["currency"]) or "EUR",
        })

    return transactions


# ── Auto-Match: Mitglied anhand IBAN oder Name ────────────────────────────────

async def _match_member(
    iban: Optional[str],
    counterparty: Optional[str],
    purpose: Optional[str],
    user_id: int,
    db: AsyncSession,
) -> tuple[Optional[Member], str]:
    """
    Returns (member, match_type) or (None, "").
    match_type: "iban" | "name" | "purpose"
    """
    if iban:
        result = await db.execute(
            select(Member).where(
                and_(Member.user_id == user_id, Member.iban == iban)
            )
        )
        m = result.scalar_one_or_none()
        if m:
            return m, "iban"

    # Name match in counterparty or purpose
    result = await db.execute(
        select(Member).where(
            and_(Member.user_id == user_id, Member.status == "active")
        )
    )
    members = result.scalars().all()

    search_text = " ".join(filter(None, [counterparty, purpose])).lower()

    for member in members:
        full = member.full_name.lower()
        last = member.last_name.lower()
        if len(last) >= 3 and (last in search_text or full in search_text):
            return member, "name"

    return None, ""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/import", response_model=ImportResult)
async def import_bank_csv(
    file: UploadFile = File(...),
    add_to_kassenbuch: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import a bank statement CSV.
    If add_to_kassenbuch=True, income transactions are auto-added to the Kassenbuch.
    """
    if not ((file.filename or "").lower().endswith(".csv")):
        raise HTTPException(status_code=400, detail="Nur CSV-Dateien werden unterstützt.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Datei zu groß. Maximum: 5 MB")

    try:
        raw_txns = _parse_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not raw_txns:
        raise HTTPException(status_code=422, detail="Keine Buchungen in der CSV-Datei gefunden.")

    results: list[BankTxnOut] = []
    member_matches = 0
    kassenbuch_added = 0
    skipped = 0

    for raw in raw_txns:
        member, match_type = await _match_member(
            raw["iban"], raw["counterparty"], raw["purpose"],
            current_user.id, db
        )
        if member:
            member_matches += 1

        txn_created = False
        if add_to_kassenbuch and raw["amount"] > 0:
            # Build description
            parts = []
            if raw["counterparty"]:
                parts.append(raw["counterparty"])
            if raw["purpose"]:
                parts.append(raw["purpose"])
            desc = " – ".join(parts) if parts else "Bankeingang"

            kassenbuch_txn = Transaction(
                user_id=current_user.id,
                member_id=member.id if member else None,
                type="income",
                amount=raw["amount"],
                description=desc[:500],
                transaction_date=raw["booking_date"],
            )
            db.add(kassenbuch_txn)
            kassenbuch_added += 1
            txn_created = True

        results.append(BankTxnOut(
            booking_date=str(raw["booking_date"]),
            counterparty=raw["counterparty"],
            iban=raw["iban"],
            purpose=raw["purpose"],
            amount=float(raw["amount"]),
            currency=raw["currency"],
            matched_member_id=member.id if member else None,
            matched_member_name=member.full_name if member else None,
            match_type=match_type or None,
            transaction_created=txn_created,
        ))

    await db.commit()

    return ImportResult(
        imported=len(raw_txns),
        member_matches=member_matches,
        kassenbuch_added=kassenbuch_added,
        skipped=skipped,
        transactions=results,
    )


@router.post("/accept-transaction")
async def accept_transaction(
    body: AcceptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually add a single bank transaction to the Kassenbuch."""
    txn_date = _parse_date(body.booking_date)
    if not txn_date:
        raise HTTPException(status_code=422, detail="Ungültiges Datum.")

    if body.member_id:
        member_res = await db.execute(
            select(Member).where(and_(Member.id == body.member_id, Member.user_id == current_user.id))
        )
        if not member_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")

    txn = Transaction(
        user_id=current_user.id,
        member_id=body.member_id,
        category_id=body.category_id,
        type=body.txn_type,
        amount=Decimal(str(abs(body.amount))),
        description=body.description[:500],
        transaction_date=txn_date,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return {"ok": True, "transaction_id": txn.id}
