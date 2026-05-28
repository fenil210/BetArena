"""
Admin router — sync endpoints for football-data.org and admin operations.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_admin
from app.models.activity import ActivityFeed
from app.models.event import Event
from app.models.market import Market
from app.models.user import User
from app.models.football_data import Competition, Team, Player, Match, competition_teams
from app.models.tournament import Tournament
from app.schemas.core import SyncSummary, CompetitionOut, TeamOut, PlayerOut
from app.services.football_api import (
    WORLD_CUP_COMPETITION_ID,
    WORLD_CUP_SEASON,
    fetch_competitions,
    fetch_world_cup_competition,
    fetch_teams_for_competition,
    fetch_fixtures_for_competition,
    fetch_squad_for_team,
    fetch_matches_for_matchday,
    fetch_competition_standings,
    fetch_competition_stages,
    FootballAPIError,
)
from app.services.world_cup import bootstrap_world_cup

router = APIRouter(prefix="/admin", tags=["Admin Sync"])

SYNC_COOLDOWN_MINUTES = 30


# ─────────────── Sync competitions ───────────────

@router.post("/sync/competitions", response_model=SyncSummary)
async def sync_competitions(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch FIFA World Cup metadata from football-data.org and upsert locally."""
    try:
        api_data = [await fetch_world_cup_competition()]
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


@router.post("/world-cup/bootstrap")
async def bootstrap_world_cup_endpoint(
    reset: bool = False,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reset optional old state and load FIFA World Cup 2026 group-stage fixtures locally."""
    try:
        return await bootstrap_world_cup(db, reset=reset)
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/world-cup/health")
def world_cup_health(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Operational health summary for the World Cup automation."""
    now = datetime.now(timezone.utc)
    competition = db.query(Competition).filter(Competition.id == WORLD_CUP_COMPETITION_ID).first()
    tournament = db.query(Tournament).filter(Tournament.competition_id == WORLD_CUP_COMPETITION_ID).first()

    fixture_query = db.query(Match).filter(Match.competition_id == WORLD_CUP_COMPETITION_ID)
    fixture_count = fixture_query.count()
    tbd_count = fixture_query.filter((Match.home_team_id == None) | (Match.away_team_id == None)).count()

    events_query = db.query(Event)
    if tournament:
        events_query = events_query.filter(Event.tournament_id == tournament.id)
    else:
        events_query = events_query.filter(False)
    event_count = events_query.count()

    market_query = db.query(Market)
    if tournament:
        market_query = market_query.filter(Market.tournament_id == tournament.id)
    else:
        market_query = market_query.filter(False)

    market_status_counts = {
        "coming_soon": market_query.filter(Market.status == "coming_soon").count(),
        "open": market_query.filter(Market.status == "open").count(),
        "locked": market_query.filter(Market.status == "locked").count(),
        "settled": market_query.filter(Market.status == "settled").count(),
        "voided": market_query.filter(Market.status == "voided").count(),
    }

    stale_open = (
        market_query
        .join(Event, Market.event_id == Event.id)
        .filter(Market.status == "open", Event.starts_at.isnot(None), Event.starts_at <= now)
        .all()
    )
    past_pending = (
        market_query
        .join(Event, Market.event_id == Event.id)
        .filter(Market.status == "coming_soon", Event.starts_at.isnot(None), Event.starts_at <= now)
        .all()
    )

    last_bootstrap = (
        db.query(ActivityFeed)
        .filter(ActivityFeed.action_type == "world_cup_bootstrap")
        .order_by(ActivityFeed.created_at.desc())
        .first()
    )

    attention_markets = []
    for market in stale_open[:8]:
        attention_markets.append({
            "id": str(market.id),
            "question": market.question,
            "status": market.status,
            "starts_at": market.event.starts_at if market.event else None,
            "reason": "Kickoff passed while market stayed open",
        })
    for market in past_pending[:8 - len(attention_markets)]:
        attention_markets.append({
            "id": str(market.id),
            "question": market.question,
            "status": market.status,
            "starts_at": market.event.starts_at if market.event else None,
            "reason": "Kickoff passed before odds were opened",
        })

    return {
        "competition": {
            "id": competition.id if competition else None,
            "name": competition.name if competition else None,
            "code": competition.code if competition else None,
            "synced_at": competition.synced_at if competition else None,
        },
        "tournament": {
            "id": str(tournament.id) if tournament else None,
            "name": tournament.name if tournament else None,
            "status": tournament.status if tournament else None,
        },
        "last_sync_at": last_bootstrap.created_at if last_bootstrap else (competition.synced_at if competition else None),
        "fixture_count": fixture_count,
        "event_count": event_count,
        "tbd_count": tbd_count,
        "known_fixture_count": fixture_count - tbd_count,
        "market_status_counts": market_status_counts,
        "pending_odds_count": market_status_counts["coming_soon"],
        "locked_market_count": market_status_counts["locked"],
        "stale_open_market_count": len(stale_open),
        "past_pending_market_count": len(past_pending),
        "attention_required_count": len(stale_open) + len(past_pending),
        "attention_markets": attention_markets,
        "automation_ok": fixture_count >= 104 and tbd_count >= 32 and len(stale_open) == 0,
    }


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
            existing.tla = item.get("tla")
            existing.crest_url = item.get("crest_url")
            existing.synced_at = now
            summary.updated += 1
        else:
            existing = Team(
                id=item["id"],
                name=item["name"],
                short_name=item.get("short_name"),
                tla=item.get("tla"),
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
        api_data = await fetch_fixtures_for_competition(
            tournament.competition_id,
            season=WORLD_CUP_SEASON if tournament.competition_id == WORLD_CUP_COMPETITION_ID else None,
        )
    except FootballAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(timezone.utc)
    summary = SyncSummary()

    for item in api_data:
        for side in ("home_team", "away_team"):
            team_item = item.get(side) or {}
            if not team_item.get("id") or not team_item.get("name"):
                continue

            team = db.query(Team).filter(Team.id == team_item.get("id")).first()
            if team:
                team.name = team_item.get("name")
                team.short_name = team_item.get("short_name")
                team.tla = team_item.get("tla")
                team.crest_url = team_item.get("crest_url")
                team.synced_at = now
            else:
                team = Team(
                    id=team_item.get("id"),
                    name=team_item.get("name"),
                    short_name=team_item.get("short_name"),
                    tla=team_item.get("tla"),
                    crest_url=team_item.get("crest_url"),
                    synced_at=now,
                )
                db.add(team)
                db.flush()
            link_exists = db.execute(
                competition_teams.select().where(
                    competition_teams.c.competition_id == tournament.competition_id,
                    competition_teams.c.team_id == team.id,
                )
            ).first()
            if not link_exists:
                db.execute(
                    competition_teams.insert().values(
                        competition_id=tournament.competition_id,
                        team_id=team.id,
                    )
                )

        existing = db.query(Match).filter(Match.id == item["id"]).first()
        if existing:
            existing.home_team_id = item["home_team_id"]
            existing.away_team_id = item["away_team_id"]
            existing.kickoff_at = item.get("kickoff_at")
            existing.matchday = item.get("matchday")
            existing.stage = item.get("stage")
            existing.group_name = item.get("group")
            existing.venue = item.get("venue")
            existing.status = item.get("status")
            existing.last_updated = item.get("last_updated")
            existing.metadata_json = item.get("metadata_json")
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
                group_name=item.get("group"),
                venue=item.get("venue"),
                status=item.get("status"),
                last_updated=item.get("last_updated"),
                metadata_json=item.get("metadata_json"),
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
    return (
        db.query(Competition)
        .filter(Competition.id == WORLD_CUP_COMPETITION_ID)
        .order_by(Competition.name)
        .all()
    )


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
