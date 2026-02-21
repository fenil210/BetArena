import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Bet(Base):
    __tablename__ = "bets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    selection_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("selections.id"), nullable=False
    )
    stake: Mapped[int] = mapped_column(Integer, nullable=False)
    potential_payout: Mapped[int] = mapped_column(Integer, nullable=False)
    # status: open | won | lost | voided
    status: Mapped[str] = mapped_column(String(20), default="open")
    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    settled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="bets")  # noqa: F821
    selection: Mapped["Selection"] = relationship(  # noqa: F821
        back_populates="bets"
    )
