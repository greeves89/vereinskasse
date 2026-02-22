from sqlalchemy import String, Integer, ForeignKey, Numeric, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from app.database import Base


class MemberGroup(Base):
    __tablename__ = "member_groups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    beitrag_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)  # Override monthly fee for this group
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True, default="#3b82f6")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="member_groups")
    members: Mapped[List["Member"]] = relationship("Member", back_populates="group")
