from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class MemberBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    member_since: Optional[date] = None
    member_number: Optional[str] = None
    status: str = "active"
    beitrag_monthly: Optional[Decimal] = None
    iban: Optional[str] = None
    notes: Optional[str] = None


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    member_since: Optional[date] = None
    member_number: Optional[str] = None
    status: Optional[str] = None
    beitrag_monthly: Optional[Decimal] = None
    iban: Optional[str] = None
    notes: Optional[str] = None


class MemberRead(MemberBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
