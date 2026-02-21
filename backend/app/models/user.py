import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    balance: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    bets: Mapped[list["Bet"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    activities: Mapped[list["ActivityFeed"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
    notifications: Mapped[list["Notification"]] = relationship(  # noqa: F821
        back_populates="user", lazy="selectin"
    )
