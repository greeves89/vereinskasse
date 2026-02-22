from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Protocol(Base):
    __tablename__ = "protocols"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    protocol_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "vorstand" | "hauptversammlung" | "ausschuss" | "sonstiges"
    meeting_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Teilnehmer als JSON-Array von Namen
    attendees: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Tagesordnungspunkte als JSON
    agenda_items: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Beschlüsse als JSON-Array
    resolutions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Freitext-Protokoll
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft | final

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="protocols")
