from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class PaymentReminderCreate(BaseModel):
    amount: Decimal
    due_date: date
    notes: Optional[str] = None


class PaymentReminderUpdate(BaseModel):
    amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PaymentReminderRead(BaseModel):
    id: int
    member_id: int
    amount: Decimal
    due_date: date
    sent_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
