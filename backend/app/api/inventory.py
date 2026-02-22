from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

from app.database import get_db
from app.models.user import User
from app.models.inventory import InventoryItem
from app.core.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])


class InventoryItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: int = 1
    location: Optional[str] = None
    status: str = "available"
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    lent_to: Optional[str] = None
    lent_since: Optional[date] = None
    notes: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    lent_to: Optional[str] = None
    lent_since: Optional[date] = None
    notes: Optional[str] = None


class LendRequest(BaseModel):
    lent_to: str
    lent_since: date


class InventoryItemResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    quantity: int
    location: Optional[str]
    status: str
    purchase_date: Optional[date]
    purchase_price: Optional[float]
    lent_to: Optional[str]
    lent_since: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[InventoryItemResponse])
async def list_inventory(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(InventoryItem).where(InventoryItem.user_id == current_user.id)
    if status:
        query = query.where(InventoryItem.status == status)
    query = query.order_by(InventoryItem.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=InventoryItemResponse, status_code=201)
async def create_inventory_item(
    data: InventoryItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = InventoryItem(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        category=data.category,
        quantity=data.quantity,
        location=data.location,
        status=data.status,
        purchase_date=data.purchase_date,
        purchase_price=data.purchase_price,
        lent_to=data.lent_to,
        lent_since=data.lent_since,
        notes=data.notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return item


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: int,
    data: InventoryItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_inventory_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    await db.delete(item)
    await db.commit()


@router.post("/{item_id}/lend", response_model=InventoryItemResponse)
async def lend_inventory_item(
    item_id: int,
    data: LendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    item.status = "lent_out"
    item.lent_to = data.lent_to
    item.lent_since = data.lent_since

    await db.commit()
    await db.refresh(item)
    return item


@router.post("/{item_id}/return", response_model=InventoryItemResponse)
async def return_inventory_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    item.status = "available"
    item.lent_to = None
    item.lent_since = None

    await db.commit()
    await db.refresh(item)
    return item
