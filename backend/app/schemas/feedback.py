from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FeedbackBase(BaseModel):
    type: str  # bug/feature/general
    title: str
    message: str


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    admin_response: Optional[str] = None


class FeedbackRead(FeedbackBase):
    id: int
    user_id: int
    status: str
    admin_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentReminderBase(BaseModel):
    member_id: int
    amount: float
    due_date: str
    notes: Optional[str] = None


class PaymentReminderCreate(PaymentReminderBase):
    pass


class PaymentReminderRead(BaseModel):
    id: int
    member_id: int
    amount: float
    due_date: str
    sent_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
