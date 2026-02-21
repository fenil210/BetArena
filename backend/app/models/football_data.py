from datetime import date, datetime, timezone

from sqlalchemy import (
    String, Integer, Date, DateTime, ForeignKey, Table, Column,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# ---------- Many-to-Many junction: Competition <-> Team ----------
competition_teams = Table(
    "competition_teams",
    Base.metadata,
    Column(
        "competition_id",
        Integer,
        ForeignKey("competitions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "team_id",
        Integer,
        ForeignKey("teams.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ---------- Competition ----------
class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emblem_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    teams: Mapped[list["Team"]] = relationship(
        secondary=competition_teams, back_populates="competitions", lazy="selectin"
    )
    matches: Mapped[list["Match"]] = relationship(
        back_populates="competition", lazy="selectin"
    )
    tournaments: Mapped[list["Tournament"]] = relationship(  # noqa: F821
        back_populates="competition", lazy="selectin"
    )


# ---------- Team ----------
class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    crest_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    competitions: Mapped[list[Competition]] = relationship(
        secondary=competition_teams, back_populates="teams", lazy="selectin"
    )
    players: Mapped[list["Player"]] = relationship(
        back_populates="team", lazy="selectin"
    )
    home_matches: Mapped[list["Match"]] = relationship(
        back_populates="home_team",
        foreign_keys="Match.home_team_id",
        lazy="selectin",
    )
    away_matches: Mapped[list["Match"]] = relationship(
        back_populates="away_team",
        foreign_keys="Match.away_team_id",
        lazy="selectin",
    )


# ---------- Player ----------
class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    team: Mapped[Team] = relationship(back_populates="players")


# ---------- Match (from football-data.org) ----------
class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id"), nullable=False
    )
    home_team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id"), nullable=False
    )
    away_team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id"), nullable=False
    )
    kickoff_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    matchday: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    competition: Mapped[Competition] = relationship(back_populates="matches")
    home_team: Mapped[Team] = relationship(
        back_populates="home_matches", foreign_keys=[home_team_id]
    )
    away_team: Mapped[Team] = relationship(
        back_populates="away_matches", foreign_keys=[away_team_id]
    )
