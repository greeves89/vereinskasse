from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.category import Category
from app.schemas.transaction import CategoryCreate, CategoryRead, CategoryUpdate
from app.core.auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])

DEFAULT_CATEGORIES = [
    {"name": "Mitgliedsbeiträge", "type": "income", "color": "#10b981"},
    {"name": "Spenden", "type": "income", "color": "#3b82f6"},
    {"name": "Veranstaltungen", "type": "income", "color": "#8b5cf6"},
    {"name": "Sonstiges (Einnahme)", "type": "income", "color": "#6b7280"},
    {"name": "Miete/Pacht", "type": "expense", "color": "#ef4444"},
    {"name": "Versicherung", "type": "expense", "color": "#f59e0b"},
    {"name": "Material", "type": "expense", "color": "#ec4899"},
    {"name": "Verwaltung", "type": "expense", "color": "#14b8a6"},
    {"name": "Sonstiges (Ausgabe)", "type": "expense", "color": "#6b7280"},
]


@router.get("", response_model=List[CategoryRead])
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category)
        .where(Category.user_id == current_user.id)
        .order_by(Category.type, Category.name)
    )
    categories = result.scalars().all()

    # Create default categories if none exist
    if not categories:
        for cat_data in DEFAULT_CATEGORIES:
            cat = Category(user_id=current_user.id, **cat_data)
            db.add(cat)
        await db.commit()
        result = await db.execute(
            select(Category)
            .where(Category.user_id == current_user.id)
            .order_by(Category.type, Category.name)
        )
        categories = result.scalars().all()

    return categories


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = Category(user_id=current_user.id, **category_data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    update_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    await db.delete(category)
    await db.commit()
