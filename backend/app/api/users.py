from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import time
from collections import defaultdict
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, PasswordChange
from app.core.auth import get_current_user
from app.core.security import verify_password, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])

# Simple in-memory rate limiter for password change: max 5 attempts per user per 15 minutes
_pw_change_attempts: dict[int, list[float]] = defaultdict(list)
_PW_LIMIT = 5
_PW_WINDOW = 15 * 60  # 15 minutes


def _check_password_rate_limit(user_id: int):
    now = time.time()
    window_start = now - _PW_WINDOW
    attempts = [t for t in _pw_change_attempts[user_id] if t > window_start]
    _pw_change_attempts[user_id] = attempts
    if len(attempts) >= _PW_LIMIT:
        retry_after = int(_PW_WINDOW - (now - attempts[0]))
        raise HTTPException(
            status_code=429,
            detail=f"Zu viele Versuche. Bitte in {retry_after // 60} Minuten erneut versuchen.",
        )
    _pw_change_attempts[user_id].append(now)


@router.get("/me", response_model=UserRead)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if update_data.email and update_data.email.lower() != current_user.email:
        result = await db.execute(select(User).where(User.email == update_data.email.lower()))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-Mail bereits vergeben")
        current_user.email = update_data.email.lower()

    if update_data.name:
        current_user.name = update_data.name
    if update_data.organization_name is not None:
        current_user.organization_name = update_data.organization_name

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_password_rate_limit(current_user.id)

    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort falsch")

    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen haben")

    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()
    return {"message": "Passwort erfolgreich geändert"}
