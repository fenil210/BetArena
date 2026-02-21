import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Numeric,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    # A market belongs to an event, a tournament, or both.
    # At least one must be set.
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("events.id"), nullable=True
    )
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=True
    )
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    # market_type: match_result | player_prop | tournament | special
    market_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # status: coming_soon | open | locked | settled | voided
    status: Mapped[str] = mapped_column(String(20), default="coming_soon")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="markets")  # noqa: F821
    tournament: Mapped["Tournament"] = relationship(  # noqa: F821
        back_populates="markets"
    )
    selections: Mapped[list["Selection"]] = relationship(
        back_populates="market", lazy="selectin", cascade="all, delete-orphan"
    )


class Selection(Base):
    __tablename__ = "selections"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    market_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("markets.id"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    odds: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    # Optional link to a player (for player prop markets)
    player_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("players.id"), nullable=True
    )
    is_winner: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Relationships
    market: Mapped[Market] = relationship(back_populates="selections")
    player: Mapped["Player"] = relationship(lazy="selectin")  # noqa: F821
    bets: Mapped[list["Bet"]] = relationship(  # noqa: F821
        back_populates="selection", lazy="selectin"
    )
