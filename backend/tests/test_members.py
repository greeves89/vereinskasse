"""Tests for member management endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import create_access_token, get_password_hash
from datetime import datetime, timezone, timedelta


async def create_verified_user(db: AsyncSession, email: str, role: str = "member") -> tuple[User, str]:
    """Helper: create a verified user and return (user, access_token)."""
    user = User(
        email=email,
        name="Test User",
        password_hash=get_password_hash("password123"),
        role=role,
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
async def test_create_member_success(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")
    res = await client.post(
        "/members",
        json={"first_name": "Max", "last_name": "Muster", "email": "max@muster.de"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["first_name"] == "Max"
    assert data["last_name"] == "Muster"


@pytest.mark.asyncio
async def test_list_members_returns_own_members_only(client: AsyncClient, db_session: AsyncSession):
    _, token1 = await create_verified_user(db_session, "user1@test.de")
    _, token2 = await create_verified_user(db_session, "user2@test.de")

    # user1 creates a member
    await client.post(
        "/members",
        json={"first_name": "Alice", "last_name": "Smith"},
        headers={"Authorization": f"Bearer {token1}"},
    )

    # user2 should see no members
    res = await client.get("/members", headers={"Authorization": f"Bearer {token2}"})
    assert res.status_code == 200
    assert len(res.json()) == 0


@pytest.mark.asyncio
async def test_update_member(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")
    create_res = await client.post(
        "/members",
        json={"first_name": "Max", "last_name": "Old"},
        headers={"Authorization": f"Bearer {token}"},
    )
    member_id = create_res.json()["id"]

    update_res = await client.put(
        f"/members/{member_id}",
        json={"last_name": "New"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["last_name"] == "New"


@pytest.mark.asyncio
async def test_delete_member(client: AsyncClient, db_session: AsyncSession):
    _, token = await create_verified_user(db_session, "owner@test.de")
    create_res = await client.post(
        "/members",
        json={"first_name": "ToDelete", "last_name": "User"},
        headers={"Authorization": f"Bearer {token}"},
    )
    member_id = create_res.json()["id"]

    del_res = await client.delete(f"/members/{member_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 204

    list_res = await client.get("/members", headers={"Authorization": f"Bearer {token}"})
    assert all(m["id"] != member_id for m in list_res.json())


@pytest.mark.asyncio
async def test_cannot_access_other_users_member(client: AsyncClient, db_session: AsyncSession):
    _, token1 = await create_verified_user(db_session, "user1@test.de")
    _, token2 = await create_verified_user(db_session, "user2@test.de")

    create_res = await client.post(
        "/members",
        json={"first_name": "Secret", "last_name": "Member"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    member_id = create_res.json()["id"]

    res = await client.get(f"/members/{member_id}", headers={"Authorization": f"Bearer {token2}"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_create_member_requires_auth(client: AsyncClient):
    res = await client.post("/members", json={"first_name": "A", "last_name": "B"})
    assert res.status_code == 401
