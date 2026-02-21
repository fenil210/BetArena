import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    tournament_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=False
    )
    # Nullable FK — events can be created without a linked API match
    match_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("matches.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # status: upcoming | live | completed | cancelled
    status: Mapped[str] = mapped_column(String(20), default="upcoming")
    starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    tournament: Mapped["Tournament"] = relationship(  # noqa: F821
        back_populates="events"
    )
    match: Mapped["Match"] = relationship(lazy="selectin")  # noqa: F821
    markets: Mapped[list["Market"]] = relationship(  # noqa: F821
        back_populates="event", lazy="selectin"
    )
