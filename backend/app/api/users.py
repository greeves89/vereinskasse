from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, PasswordChange
from app.core.auth import get_current_user
from app.core.security import verify_password, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


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
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort falsch")

    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen haben")

    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()
    return {"message": "Passwort erfolgreich geändert"}
