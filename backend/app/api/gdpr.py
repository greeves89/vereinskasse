import json
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.member import Member
from app.models.transaction import Transaction
from app.core.auth import get_current_user

router = APIRouter(prefix="/gdpr", tags=["gdpr"])


@router.get("/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """DSGVO Art. 20 - Datenportabilität: Export aller persönlichen Daten"""
    members_result = await db.execute(
        select(Member).where(Member.user_id == current_user.id)
    )
    members = members_result.scalars().all()

    transactions_result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id)
    )
    transactions = transactions_result.scalars().all()

    data = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "organization_name": current_user.organization_name,
            "role": current_user.role,
            "subscription_tier": current_user.subscription_tier,
            "created_at": current_user.created_at.isoformat(),
        },
        "members": [
            {
                "id": m.id,
                "first_name": m.first_name,
                "last_name": m.last_name,
                "email": m.email,
                "phone": m.phone,
                "member_since": str(m.member_since) if m.member_since else None,
                "member_number": m.member_number,
                "status": m.status,
                "beitrag_monthly": str(m.beitrag_monthly) if m.beitrag_monthly else None,
                "iban": m.iban,
                "created_at": m.created_at.isoformat(),
            }
            for m in members
        ],
        "transactions": [
            {
                "id": t.id,
                "type": t.type,
                "amount": str(t.amount),
                "description": t.description,
                "category": t.category,
                "transaction_date": str(t.transaction_date),
                "receipt_number": t.receipt_number,
                "notes": t.notes,
                "created_at": t.created_at.isoformat(),
            }
            for t in transactions
        ],
    }

    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    return Response(
        content=json_str.encode("utf-8"),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="vereinskasse_daten_{current_user.id}.json"'},
    )


@router.delete("/delete-account")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """DSGVO Art. 17 - Recht auf Löschung"""
    if current_user.is_admin:
        from sqlalchemy import func
        count_result = await db.execute(
            select(func.count(User.id)).where(User.role == "admin")
        )
        admin_count = count_result.scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Sie können Ihr Konto nicht löschen, da Sie der einzige Administrator sind. Ernennen Sie zuerst einen anderen Administrator.",
            )

    await db.delete(current_user)
    await db.commit()
    return {"message": "Ihr Konto und alle zugehörigen Daten wurden gemäß DSGVO Art. 17 gelöscht."}
