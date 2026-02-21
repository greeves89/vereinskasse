from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class TransactionBase(BaseModel):
    type: str  # income/expense
    amount: Decimal
    description: str
    category: Optional[str] = None
    category_id: Optional[int] = None
    member_id: Optional[int] = None
    transaction_date: date
    receipt_number: Optional[str] = None
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[int] = None
    member_id: Optional[int] = None
    transaction_date: Optional[date] = None
    receipt_number: Optional[str] = None
    notes: Optional[str] = None


class TransactionRead(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryBase(BaseModel):
    name: str
    type: str  # income/expense
    color: Optional[str] = "#3b82f6"


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None


class CategoryRead(CategoryBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionStats(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    month_income: Decimal
    month_expense: Decimal
    transaction_count: int
