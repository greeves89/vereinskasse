"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_creates_admin_for_first_user(client: AsyncClient):
    """First registered user should become admin."""
    res = await client.post("/auth/register", json={
        "email": "admin@test.de",
        "name": "Admin User",
        "password": "secure_password123",
        "organization_name": "Test Verein",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "admin@test.de"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_register_second_user_is_member(client: AsyncClient):
    """Second registered user should be member role."""
    await client.post("/auth/register", json={
        "email": "admin@test.de",
        "name": "Admin",
        "password": "password123",
    })
    res = await client.post("/auth/register", json={
        "email": "user@test.de",
        "name": "Regular User",
        "password": "password123",
    })
    assert res.status_code == 201
    assert res.json()["role"] == "member"


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    """Registering with the same email twice should fail."""
    payload = {"email": "dup@test.de", "name": "Test", "password": "password123"}
    await client.post("/auth/register", json=payload)
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 400
    assert "registriert" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_unverified_user_blocked(client: AsyncClient):
    """Unverified user cannot log in."""
    await client.post("/auth/register", json={
        "email": "unverified@test.de",
        "name": "Unverified",
        "password": "password123",
    })
    # Login attempt without verifying email
    # First user is admin and gets auto-login token but is_verified=False
    res = await client.post("/auth/login", json={
        "email": "unverified@test.de",
        "password": "password123",
    })
    assert res.status_code == 403
    assert "verifizier" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_wrong_password_fails(client: AsyncClient):
    """Wrong password returns 401."""
    await client.post("/auth/register", json={
        "email": "user@test.de",
        "name": "User",
        "password": "correct_password",
    })
    res = await client.post("/auth/login", json={
        "email": "user@test.de",
        "password": "wrong_password",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user_fails(client: AsyncClient):
    """Login with unknown email returns 401."""
    res = await client.post("/auth/login", json={
        "email": "nobody@test.de",
        "password": "password123",
    })
    assert res.status_code == 401
