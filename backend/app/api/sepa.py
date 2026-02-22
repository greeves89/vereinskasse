"""
SEPA-Lastschrift XML Generator für Mitgliedsbeiträge
Erzeugt SEPA Direct Debit (pain.008.003.02) XML für den Bankupload.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime, timezone
import xml.etree.ElementTree as ET
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.core.auth import get_current_user

router = APIRouter(prefix="/sepa", tags=["sepa"])


class SepaExportRequest(BaseModel):
    collection_date: str  # ISO date: YYYY-MM-DD
    creditor_iban: str
    creditor_bic: str
    creditor_id: str  # SEPA-Gläubiger-ID
    member_ids: Optional[List[int]] = None  # None = all active members with IBAN


def clean_sepa_string(s: str) -> str:
    """Remove characters not allowed in SEPA XML."""
    allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /-?:().,'+")
    return "".join(c for c in s if c in allowed or c in "äöüÄÖÜß").strip()[:140]


def format_amount(amount: Decimal) -> str:
    return f"{float(amount):.2f}"


def generate_sepa_xml(
    user: User,
    members: list,
    creditor_iban: str,
    creditor_bic: str,
    creditor_id: str,
    collection_date: date,
) -> str:
    """Generate SEPA Direct Debit XML (pain.008.003.02)."""
    now = datetime.now(timezone.utc)
    msg_id = f"VK-{now.strftime('%Y%m%d%H%M%S')}"
    creation_dt = now.strftime("%Y-%m-%dT%H:%M:%S")

    # Filter members with IBAN and beitrag
    valid_members = [
        m for m in members
        if m.iban and m.beitrag_monthly and m.beitrag_monthly > 0
    ]

    if not valid_members:
        raise ValueError("Keine Mitglieder mit IBAN und Beitrag gefunden")

    total_amount = sum(m.beitrag_monthly for m in valid_members)
    nb_txs = len(valid_members)

    creditor_name = clean_sepa_string(user.organization_name or user.name or "Verein")

    # Build XML
    ns = "urn:iso:std:iso:20022:tech:xsd:pain.008.003.02"
    root = ET.Element("Document", xmlns=ns)
    cdd = ET.SubElement(root, "CstmrDrctDbtInitn")

    # Group Header
    grp_hdr = ET.SubElement(cdd, "GrpHdr")
    ET.SubElement(grp_hdr, "MsgId").text = msg_id
    ET.SubElement(grp_hdr, "CreDtTm").text = creation_dt
    ET.SubElement(grp_hdr, "NbOfTxs").text = str(nb_txs)
    ET.SubElement(grp_hdr, "CtrlSum").text = format_amount(total_amount)
    initg_pty = ET.SubElement(grp_hdr, "InitgPty")
    ET.SubElement(initg_pty, "Nm").text = creditor_name

    # Payment Info
    pmt_inf = ET.SubElement(cdd, "PmtInf")
    ET.SubElement(pmt_inf, "PmtInfId").text = f"{msg_id}-PMT"
    ET.SubElement(pmt_inf, "PmtMtd").text = "DD"
    ET.SubElement(pmt_inf, "NbOfTxs").text = str(nb_txs)
    ET.SubElement(pmt_inf, "CtrlSum").text = format_amount(total_amount)

    pmt_tp_inf = ET.SubElement(pmt_inf, "PmtTpInf")
    svc_lvl = ET.SubElement(pmt_tp_inf, "SvcLvl")
    ET.SubElement(svc_lvl, "Cd").text = "SEPA"
    lcl_instrm = ET.SubElement(pmt_tp_inf, "LclInstrm")
    ET.SubElement(lcl_instrm, "Cd").text = "CORE"
    ET.SubElement(pmt_tp_inf, "SeqTp").text = "RCUR"

    ET.SubElement(pmt_inf, "ReqdColltnDt").text = collection_date.isoformat()

    # Creditor
    cdtr = ET.SubElement(pmt_inf, "Cdtr")
    ET.SubElement(cdtr, "Nm").text = creditor_name

    cdtr_acct = ET.SubElement(pmt_inf, "CdtrAcct")
    cdtr_id = ET.SubElement(cdtr_acct, "Id")
    ET.SubElement(cdtr_id, "IBAN").text = creditor_iban.replace(" ", "")

    cdtr_agt = ET.SubElement(pmt_inf, "CdtrAgt")
    fin_instn_id = ET.SubElement(cdtr_agt, "FinInstnId")
    ET.SubElement(fin_instn_id, "BIC").text = creditor_bic

    # Transactions
    for i, member in enumerate(valid_members, 1):
        tx = ET.SubElement(pmt_inf, "DrctDbtTxInf")
        pmt_id = ET.SubElement(tx, "PmtId")
        ET.SubElement(pmt_id, "EndToEndId").text = f"BEITRAG-{member.id}-{collection_date.strftime('%Y%m')}"

        amt = ET.SubElement(tx, "InstdAmt", Ccy="EUR")
        amt.text = format_amount(member.beitrag_monthly)

        drct_dbt_tx = ET.SubElement(tx, "DrctDbtTx")
        mndt_rltd_inf = ET.SubElement(drct_dbt_tx, "MndtRltdInf")
        ET.SubElement(mndt_rltd_inf, "MndtId").text = f"MANDAT-{member.id}"
        ET.SubElement(mndt_rltd_inf, "DtOfSgntr").text = (member.member_since or collection_date).isoformat()

        cdtr_scheme_id = ET.SubElement(drct_dbt_tx, "CdtrSchmeId")
        cdtr_scheme_id_inner = ET.SubElement(cdtr_scheme_id, "Id")
        prvt_id = ET.SubElement(cdtr_scheme_id_inner, "PrvtId")
        othr = ET.SubElement(prvt_id, "Othr")
        ET.SubElement(othr, "Id").text = creditor_id
        schme_nm = ET.SubElement(othr, "SchmeNm")
        ET.SubElement(schme_nm, "Prtry").text = "SEPA"

        # Debtor Agent (no BIC needed for IBAN-only SEPA)
        dbtr_agt = ET.SubElement(tx, "DbtrAgt")
        dbtr_fin = ET.SubElement(dbtr_agt, "FinInstnId")
        ET.SubElement(dbtr_fin, "Othr").text  # empty

        # Debtor
        dbtr = ET.SubElement(tx, "Dbtr")
        ET.SubElement(dbtr, "Nm").text = clean_sepa_string(member.full_name)

        dbtr_acct = ET.SubElement(tx, "DbtrAcct")
        dbtr_acct_id = ET.SubElement(dbtr_acct, "Id")
        ET.SubElement(dbtr_acct_id, "IBAN").text = member.iban.replace(" ", "")

        # Purpose
        purp = ET.SubElement(tx, "Purp")
        ET.SubElement(purp, "Cd").text = "MSVC"

        # Remittance
        rmt_inf = ET.SubElement(tx, "RmtInf")
        ET.SubElement(rmt_inf, "Ustrd").text = f"Mitgliedsbeitrag {collection_date.strftime('%B %Y')} {member.member_number or ''}"

    # Convert to string
    ET.indent(root, space="  ")
    xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")
    return xml_str


@router.post("/export")
async def export_sepa_xml(
    data: SepaExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate SEPA Direct Debit XML for membership fee collection."""
    try:
        collection_date = date.fromisoformat(data.collection_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ungültiges Datum. Format: YYYY-MM-DD")

    # Fetch members
    query = select(Member).where(
        Member.user_id == current_user.id,
        Member.status == "active",
    )
    if data.member_ids:
        query = query.where(Member.id.in_(data.member_ids))

    result = await db.execute(query.order_by(Member.last_name))
    members = result.scalars().all()

    valid_members = [m for m in members if m.iban and m.beitrag_monthly and m.beitrag_monthly > 0]

    if not valid_members:
        raise HTTPException(
            status_code=400,
            detail="Keine aktiven Mitglieder mit IBAN und Monatsbeitrag gefunden. "
                   "Bitte hinterlegen Sie IBAN und Beitrag bei den Mitgliedern."
        )

    try:
        xml_content = generate_sepa_xml(
            user=current_user,
            members=valid_members,
            creditor_iban=data.creditor_iban,
            creditor_bic=data.creditor_bic,
            creditor_id=data.creditor_id,
            collection_date=collection_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = f"SEPA-Lastschrift-{collection_date.strftime('%Y-%m')}.xml"
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/preview")
async def preview_sepa_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Preview which members would be included in SEPA export."""
    result = await db.execute(
        select(Member).where(
            Member.user_id == current_user.id,
            Member.status == "active",
        ).order_by(Member.last_name)
    )
    members = result.scalars().all()

    return {
        "total_members": len(members),
        "members_with_iban": [
            {
                "id": m.id,
                "name": m.full_name,
                "member_number": m.member_number,
                "iban": f"****{m.iban[-4:]}" if m.iban else None,
                "beitrag_monthly": float(m.beitrag_monthly) if m.beitrag_monthly else None,
                "has_iban": bool(m.iban),
                "has_beitrag": bool(m.beitrag_monthly and m.beitrag_monthly > 0),
            }
            for m in members
        ],
        "ready_for_sepa": sum(1 for m in members if m.iban and m.beitrag_monthly and m.beitrag_monthly > 0),
    }
