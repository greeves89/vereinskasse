"""Tests for transaction management endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import create_access_token, get_password_hash


async def create_verified_user(db: AsyncSession, email: str) -> tuple[User, str]:
    user = User(
        email=email,
        name="Test User",
        password_hash=get_password_hash("password123"),
        role="member",
        is_active=True,
        is_verified=True,
        organization_name="Test Verein",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return user, token


@pytest.mark.asyncio
async def test_create_income_transaction(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")
    res = await client.post(
        "/transactions",
        json={
            "type": "income",
            "amount": "150.00",
            "description": "Mitgliedsbeitrag",
            "transaction_date": "2026-01-15",
            "category": "Beiträge",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "income"
    assert float(data["amount"]) == 150.0
    assert data["description"] == "Mitgliedsbeitrag"


@pytest.mark.asyncio
async def test_create_expense_transaction(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")
    res = await client.post(
        "/transactions",
        json={
            "type": "expense",
            "amount": "50.00",
            "description": "Vereinskosten",
            "transaction_date": "2026-01-20",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    assert res.json()["type"] == "expense"


@pytest.mark.asyncio
async def test_list_transactions_only_own(client: AsyncClient, db_session: AsyncSession):
    _, token1 = await create_verified_user(db_session, "user1@test.de")
    _, token2 = await create_verified_user(db_session, "user2@test.de")

    await client.post(
        "/transactions",
        json={"type": "income", "amount": "100.00", "description": "Test", "transaction_date": "2026-01-01"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    res = await client.get("/transactions", headers={"Authorization": f"Bearer {token2}"})
    assert res.status_code == 200
    assert len(res.json()) == 0


@pytest.mark.asyncio
async def test_delete_transaction(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")
    create_res = await client.post(
        "/transactions",
        json={"type": "income", "amount": "100.00", "description": "To delete", "transaction_date": "2026-01-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    tx_id = create_res.json()["id"]

    del_res = await client.delete(f"/transactions/{tx_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_transaction_stats(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")

    await client.post(
        "/transactions",
        json={"type": "income", "amount": "200.00", "description": "Income", "transaction_date": "2026-01-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        "/transactions",
        json={"type": "expense", "amount": "80.00", "description": "Expense", "transaction_date": "2026-01-02"},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = await client.get("/transactions/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert float(data["total_income"]) == 200.0
    assert float(data["total_expense"]) == 80.0


@pytest.mark.asyncio
async def test_transaction_requires_auth(client: AsyncClient):
    res = await client.get("/transactions")
    assert res.status_code == 401
