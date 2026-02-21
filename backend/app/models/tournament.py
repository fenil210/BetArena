import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tournament(Base):
    __tablename__ = "tournaments"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id"), nullable=False
    )
    # status: upcoming | active | completed
    status: Mapped[str] = mapped_column(String(20), default="upcoming")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    competition: Mapped["Competition"] = relationship(  # noqa: F821
        back_populates="tournaments"
    )
    events: Mapped[list["Event"]] = relationship(  # noqa: F821
        back_populates="tournament", lazy="selectin"
    )
    markets: Mapped[list["Market"]] = relationship(  # noqa: F821
        back_populates="tournament", lazy="selectin"
    )
