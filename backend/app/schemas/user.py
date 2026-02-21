from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    name: str
    organization_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    organization_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserRead(UserBase):
    id: int
    role: str
    is_active: bool
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: int
    email: str
    name: str
    role: str
    organization_name: Optional[str] = None
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_tier: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None
