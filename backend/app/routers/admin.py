"""
Admin router — sync endpoints for football-data.org and admin operations.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_admin
from app.models.user import User
from app.models.football_data import Competition, Team, Player, Match, competition_teams
from app.models.tournament import Tournament
from app.schemas.core import SyncSummary, CompetitionOut, TeamOut, PlayerOut
from app.services.football_api import (
    fetch_competitions,
    fetch_teams_for_competition,
    fetch_fixtures_for_competition,
    fetch_squad_for_team,
    fetch_matches_for_matchday,
    fetch_competition_standings,
    fetch_competition_stages,
    FootballAPIError,
)

router = APIRouter(prefix="/admin", tags=["Admin Sync"])

SYNC_COOLDOWN_MINUTES = 30


# ─────────────── Sync competitions ───────────────

@router.post("/sync/competitions", response_model=SyncSummary)
async def sync_competitions(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch all competitions from football-data.org and upsert locally."""
    try:
        api_data = await fetch_competitions()
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(timezone.utc)
    summary = SyncSummary()

    for item in api_data:
        existing = db.query(Competition).filter(Competition.id == item["id"]).first()
        if existing:
            # Check cooldown
            if existing.synced_at and (now - existing.synced_at) < timedelta(minutes=SYNC_COOLDOWN_MINUTES):
                summary.skipped += 1
                continue
            existing.name = item["name"]
            existing.code = item.get("code")
            existing.emblem_url = item.get("emblem_url")
            existing.synced_at = now
            summary.updated += 1
        else:
            db.add(Competition(
                id=item["id"],
                name=item["name"],
                code=item.get("code"),
                emblem_url=item.get("emblem_url"),
                synced_at=now,
            ))
            summary.created += 1

    db.commit()
    return summary


# ─────────────── Sync teams for a tournament ───────────────

@router.post("/tournaments/{tournament_id}/sync-teams", response_model=SyncSummary)
async def sync_teams(
    tournament_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch teams for the tournament's competition and upsert them locally."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    try:
        api_data = await fetch_teams_for_competition(tournament.competition_id)
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(timezone.utc)
    summary = SyncSummary()

    for item in api_data:
        existing = db.query(Team).filter(Team.id == item["id"]).first()
        if existing:
            existing.name = item["name"]
            existing.short_name = item.get("short_name")
            existing.crest_url = item.get("crest_url")
            existing.synced_at = now
            summary.updated += 1
        else:
            existing = Team(
                id=item["id"],
                name=item["name"],
                short_name=item.get("short_name"),
                crest_url=item.get("crest_url"),
                synced_at=now,
            )
            db.add(existing)
            db.flush()  # ensure the team exists before inserting junction row
            summary.created += 1

        # Upsert the competition_teams junction
        link_exists = db.execute(
            competition_teams.select().where(
                competition_teams.c.competition_id == tournament.competition_id,
                competition_teams.c.team_id == item["id"],
            )
        ).first()
        if not link_exists:
            db.execute(
                competition_teams.insert().values(
                    competition_id=tournament.competition_id,
                    team_id=item["id"],
                )
            )

    db.commit()
    return summary


# ─────────────── Sync fixtures for a tournament ───────────────

@router.post("/tournaments/{tournament_id}/sync-fixtures", response_model=SyncSummary)
async def sync_fixtures(
    tournament_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch all fixtures for the tournament's competition and upsert them locally."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    try:
        api_data = await fetch_fixtures_for_competition(tournament.competition_id)
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(timezone.utc)
    summary = SyncSummary()

    for item in api_data:
        # Skip matches with missing team data
        if not item.get("home_team_id") or not item.get("away_team_id"):
            summary.skipped += 1
            continue

        existing = db.query(Match).filter(Match.id == item["id"]).first()
        if existing:
            existing.home_team_id = item["home_team_id"]
            existing.away_team_id = item["away_team_id"]
            existing.kickoff_at = item.get("kickoff_at")
            existing.matchday = item.get("matchday")
            existing.stage = item.get("stage")
            existing.status = item.get("status")
            existing.synced_at = now
            summary.updated += 1
        else:
            db.add(Match(
                id=item["id"],
                competition_id=tournament.competition_id,
                home_team_id=item["home_team_id"],
                away_team_id=item["away_team_id"],
                kickoff_at=item.get("kickoff_at"),
                matchday=item.get("matchday"),
                stage=item.get("stage"),
                status=item.get("status"),
                synced_at=now,
            ))
            summary.created += 1

    db.commit()
    return summary


# ─────────────── Sync squad for a single team ───────────────

@router.post("/teams/{team_id}/sync-squad", response_model=SyncSummary)
async def sync_squad(
    team_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch the current squad for a team and upsert players locally."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found in local database. Sync teams first.")

    now = datetime.now(timezone.utc)

    try:
        api_data = await fetch_squad_for_team(team_id)
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    summary = SyncSummary()

    for item in api_data:
        existing = db.query(Player).filter(Player.id == item["id"]).first()
        if existing:
            existing.name = item["name"]
            existing.position = item.get("position")
            existing.nationality = item.get("nationality")
            existing.date_of_birth = item.get("date_of_birth")
            existing.team_id = team_id
            existing.synced_at = now
            summary.updated += 1
        else:
            db.add(Player(
                id=item["id"],
                team_id=team_id,
                name=item["name"],
                position=item.get("position"),
                nationality=item.get("nationality"),
                date_of_birth=item.get("date_of_birth"),
                synced_at=now,
            ))
            summary.created += 1

    team.synced_at = now
    db.commit()
    return summary


# ─────────────── Read-only helpers for admin panel ───────────────

@router.get("/competitions", response_model=list[CompetitionOut])
def list_competitions(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all locally stored competitions (for dropdown)."""
    return db.query(Competition).order_by(Competition.name).all()


@router.get("/competitions/{competition_id}/teams", response_model=list[TeamOut])
def list_competition_teams(
    competition_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all locally stored teams for a competition."""
    comp = db.query(Competition).filter(Competition.id == competition_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    return comp.teams


@router.get("/teams/{team_id}/players", response_model=list[PlayerOut])
def list_team_players(
    team_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all locally stored players for a team (for prop market dropdowns)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team.players


# ─────────────── Fetch matches for tournament ───────────────

@router.get("/tournaments/{tournament_id}/matches")
async def get_tournament_matches(
    tournament_id: str,
    matchday: int | None = None,
    stage: str | None = None,
    group: str | None = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Fetch matches from football-data.org for a tournament's competition.
    
    Query params:
    - matchday: For league competitions (e.g., 27 for Serie A, 8 for UCL league stage)
    - stage: For cup competitions (e.g., 'GROUP_STAGE', 'LAST_16', 'QUARTER_FINALS')
    - group: For World Cup group stage (e.g., 'GROUP_A', 'GROUP_B')
    
    Returns live API data (not stored locally).
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    try:
        matches = await fetch_matches_for_matchday(
            tournament.competition_id, 
            matchday=matchday,
            stage=stage,
            group=group
        )
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "competition_id": tournament.competition_id,
        "tournament_id": tournament_id,
        "matchday": matchday,
        "stage": stage,
        "group": group,
        "matches": matches,
    }


@router.get("/tournaments/{tournament_id}/season-info")
async def get_tournament_season_info(
    tournament_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get season info for a tournament's competition from football-data.org.
    Includes: current_matchday, season dates, and available stages.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    try:
        standings = await fetch_competition_standings(tournament.competition_id)
        stages = await fetch_competition_stages(tournament.competition_id)
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not standings:
        raise HTTPException(status_code=404, detail="Competition data not available")

    return {
        **standings,
        "stages": stages,
    }
