import uuid
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field


# ───────────────────────── Football API sync ─────────────────────────

class SyncSummary(BaseModel):
    created: int = 0
    updated: int = 0
    skipped: int = 0


# ───────────────────────── Competition ─────────────────────────

class CompetitionOut(BaseModel):
    id: int
    name: str
    code: str | None = None
    emblem_url: str | None = None
    synced_at: datetime | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Team ─────────────────────────

class TeamOut(BaseModel):
    id: int
    name: str
    short_name: str | None = None
    crest_url: str | None = None
    synced_at: datetime | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Player ─────────────────────────

class PlayerOut(BaseModel):
    id: int
    team_id: int
    name: str
    position: str | None = None
    nationality: str | None = None
    date_of_birth: date | None = None  # ISO date
    synced_at: datetime | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Match (fixture) ─────────────────────────

class MatchOut(BaseModel):
    id: int
    competition_id: int
    home_team_id: int
    away_team_id: int
    kickoff_at: datetime | None = None
    matchday: int | None = None
    stage: str | None = None
    status: str | None = None
    synced_at: datetime | None = None
    home_team: TeamOut | None = None
    away_team: TeamOut | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Tournament ─────────────────────────

class TournamentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    competition_id: int


class TournamentUpdate(BaseModel):
    status: str = Field(..., pattern="^(upcoming|active|completed)$")


class TournamentOut(BaseModel):
    id: uuid.UUID
    name: str
    competition_id: int
    status: str
    created_at: datetime
    competition: CompetitionOut | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Event ─────────────────────────

class EventCreate(BaseModel):
    tournament_id: uuid.UUID
    match_id: int | None = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    starts_at: datetime | None = None


class EventUpdate(BaseModel):
    status: str = Field(..., pattern="^(upcoming|live|completed|cancelled)$")


class EventOut(BaseModel):
    id: uuid.UUID
    tournament_id: uuid.UUID
    match_id: int | None = None
    title: str
    description: str | None = None
    status: str
    starts_at: datetime | None = None
    created_at: datetime
    match: MatchOut | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Selection ─────────────────────────

class SelectionCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    odds: Decimal = Field(..., gt=1.0)
    player_id: int | None = None


class SelectionUpdate(BaseModel):
    odds: Decimal = Field(..., gt=1.0)


class SelectionOut(BaseModel):
    id: uuid.UUID
    market_id: uuid.UUID
    label: str
    odds: Decimal
    player_id: int | None = None
    is_winner: bool | None = None
    player: PlayerOut | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Market ─────────────────────────

class MarketCreate(BaseModel):
    event_id: uuid.UUID | None = None
    tournament_id: uuid.UUID | None = None
    question: str = Field(..., min_length=1, max_length=500)
    market_type: str = Field(..., pattern="^(match_result|match_winner|player_prop|tournament|special|over_under|both_teams_score|first_scorer|custom)$")
    status: str = "coming_soon"
    selections: list[SelectionCreate] = Field(..., min_length=2)


class MarketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(coming_soon|open|locked|settled|voided)$")


class MarketOut(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID | None = None
    tournament_id: uuid.UUID | None = None
    question: str
    market_type: str
    status: str
    created_at: datetime
    selections: list[SelectionOut] = []

    model_config = {"from_attributes": True}


# ───────────────────────── Bet ─────────────────────────

class BetCreate(BaseModel):
    selection_id: uuid.UUID
    stake: int = Field(..., gt=0)


class BetOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    selection_id: uuid.UUID
    stake: int
    potential_payout: int
    status: str
    placed_at: datetime
    settled_at: datetime | None = None
    selection: SelectionOut | None = None

    model_config = {"from_attributes": True}


# ───────────────────────── Settlement ─────────────────────────

class SettleMarketRequest(BaseModel):
    winning_selection_id: uuid.UUID


# ───────────────────────── Activity Feed ─────────────────────────

class ActivityOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    action_type: str
    description: str
    metadata_json: dict | None = None
    created_at: datetime
    username: str | None = None  # populated in the router

    model_config = {"from_attributes": True}


# ───────────────────────── Leaderboard ─────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    username: str
    balance: int
    total_bets: int = 0
    won_bets: int = 0
    profit: int = 0  # for tournament-specific leaderboard
