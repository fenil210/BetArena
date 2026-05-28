from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.activity import ActivityFeed, Notification
from app.models.bet import Bet
from app.models.event import Event
from app.models.football_data import Competition, Match, Player, Team, competition_teams
from app.models.market import Market, Selection
from app.models.tournament import Tournament
from app.models.user import User
from app.services.football_api import (
    WORLD_CUP_COMPETITION_ID,
    WORLD_CUP_SEASON,
    fetch_fixtures_for_competition,
    fetch_world_cup_competition,
)

WORLD_CUP_TOURNAMENT_NAME = "FIFA World Cup 2026"


def provider_status_to_event_status(status: str | None) -> str:
    status = (status or "").upper()
    if status in {"IN_PLAY", "LIVE", "PAUSED"}:
        return "live"
    if status in {"FINISHED", "AWARDED"}:
        return "completed"
    if status in {"POSTPONED", "SUSPENDED", "CANCELLED", "CANCELED"}:
        return "cancelled"
    return "upcoming"


def describe_match(item: dict) -> str:
    parts = []
    if item.get("group"):
        parts.append(item["group"].replace("_", " ").title())
    if item.get("matchday"):
        parts.append(f"Matchday {item['matchday']}")
    if item.get("venue"):
        parts.append(item["venue"])
    return " - ".join(parts) or "World Cup fixture"


def match_title(item: dict) -> str:
    home = item.get("home_team", {})
    away = item.get("away_team", {})
    home_name = home.get("short_name") or home.get("name") or "TBD"
    away_name = away.get("short_name") or away.get("name") or "TBD"
    return f"{home_name} vs {away_name}"


def reset_competition_state(db: Session) -> dict:
    counts = {
        "notifications": db.query(Notification).delete(synchronize_session=False),
        "activity": db.query(ActivityFeed).delete(synchronize_session=False),
        "bets": db.query(Bet).delete(synchronize_session=False),
        "selections": db.query(Selection).delete(synchronize_session=False),
        "markets": db.query(Market).delete(synchronize_session=False),
        "events": db.query(Event).delete(synchronize_session=False),
        "tournaments": db.query(Tournament).delete(synchronize_session=False),
        "matches": db.query(Match).delete(synchronize_session=False),
        "players": db.query(Player).delete(synchronize_session=False),
    }
    db.execute(competition_teams.delete())
    counts["teams"] = db.query(Team).delete(synchronize_session=False)
    counts["competitions"] = db.query(Competition).delete(synchronize_session=False)

    users_reset = 0
    admins_reset = 0
    for user in db.query(User).all():
        if user.is_admin:
            user.balance = 0
            admins_reset += 1
        else:
            user.balance = 1000
            users_reset += 1

    counts["users_reset"] = users_reset
    counts["admins_reset"] = admins_reset
    db.commit()
    return counts


def upsert_team(db: Session, item: dict) -> Team | None:
    if not item.get("id") or not item.get("name"):
        return None

    team = db.query(Team).filter(Team.id == item["id"]).first()
    if not team:
        team = Team(id=item["id"], name=item["name"])
        db.add(team)

    team.name = item["name"]
    team.short_name = item.get("short_name")
    team.tla = item.get("tla")
    team.crest_url = item.get("crest_url")
    team.synced_at = datetime.now(timezone.utc)
    db.flush()
    return team


def ensure_competition_team_link(db: Session, competition_id: int, team_id: int) -> None:
    exists = db.execute(
        competition_teams.select().where(
            competition_teams.c.competition_id == competition_id,
            competition_teams.c.team_id == team_id,
        )
    ).first()
    if not exists:
        db.execute(
            competition_teams.insert().values(
                competition_id=competition_id,
                team_id=team_id,
            )
        )


def upsert_match(db: Session, item: dict) -> Match:
    match = db.query(Match).filter(Match.id == item["id"]).first()
    if not match:
        match = Match(
            id=item["id"],
            competition_id=item["competition_id"],
            home_team_id=item["home_team_id"],
            away_team_id=item["away_team_id"],
        )
        db.add(match)

    match.competition_id = item["competition_id"]
    match.home_team_id = item["home_team_id"]
    match.away_team_id = item["away_team_id"]
    match.kickoff_at = item.get("kickoff_at")
    match.matchday = item.get("matchday")
    match.stage = item.get("stage")
    match.group_name = item.get("group")
    match.venue = item.get("venue")
    match.status = item.get("status")
    match.last_updated = item.get("last_updated")
    match.metadata_json = item.get("metadata_json")
    match.synced_at = datetime.now(timezone.utc)
    return match


def upsert_event(db: Session, tournament: Tournament, item: dict) -> Event:
    event = db.query(Event).filter(Event.match_id == item["id"]).first()
    if not event:
        event = Event(tournament_id=tournament.id, match_id=item["id"])
        db.add(event)

    event.tournament_id = tournament.id
    event.title = match_title(item)
    event.description = describe_match(item)
    event.starts_at = item.get("kickoff_at")
    event.status = provider_status_to_event_status(item.get("status"))
    return event


def ensure_default_match_market(db: Session, tournament: Tournament, event: Event, item: dict) -> bool:
    if not item.get("home_team_id") or not item.get("away_team_id"):
        return False

    existing = (
        db.query(Market)
        .filter(Market.event_id == event.id, Market.market_type == "match_result")
        .first()
    )
    if existing:
        return False

    market = Market(
        event_id=event.id,
        tournament_id=tournament.id,
        question=f"Match result: {event.title}",
        market_type="match_result",
        status="coming_soon",
    )
    db.add(market)
    db.flush()

    home = item.get("home_team", {})
    away = item.get("away_team", {})
    selections = [
        (home.get("short_name") or home.get("name") or "Home", Decimal("2.00")),
        ("Draw", Decimal("3.00")),
        (away.get("short_name") or away.get("name") or "Away", Decimal("2.00")),
    ]
    for label, odds in selections:
        db.add(Selection(market_id=market.id, label=label, odds=odds))
    return True


async def bootstrap_world_cup(db: Session, reset: bool = False) -> dict:
    if reset:
        reset_competition_state(db)

    comp = await fetch_world_cup_competition()
    competition = db.query(Competition).filter(Competition.id == WORLD_CUP_COMPETITION_ID).first()
    if not competition:
        competition = Competition(id=WORLD_CUP_COMPETITION_ID, name=comp["name"])
        db.add(competition)

    competition.name = comp["name"]
    competition.code = comp.get("code")
    competition.emblem_url = comp.get("emblem_url")
    competition.synced_at = datetime.now(timezone.utc)

    tournament = (
        db.query(Tournament)
        .filter(Tournament.competition_id == WORLD_CUP_COMPETITION_ID)
        .first()
    )
    if not tournament:
        tournament = Tournament(
            name=WORLD_CUP_TOURNAMENT_NAME,
            competition_id=WORLD_CUP_COMPETITION_ID,
            status="upcoming",
        )
        db.add(tournament)
        db.flush()
    else:
        tournament.name = WORLD_CUP_TOURNAMENT_NAME
        tournament.status = "upcoming"

    db.commit()
    db.refresh(tournament)

    fixtures = await fetch_fixtures_for_competition(
        WORLD_CUP_COMPETITION_ID,
        season=WORLD_CUP_SEASON,
    )

    summary = {
        "competition_id": WORLD_CUP_COMPETITION_ID,
        "season": WORLD_CUP_SEASON,
        "fixtures_received": len(fixtures),
        "fixtures_stored": 0,
        "events_created_or_updated": 0,
        "markets_created": 0,
        "teams_upserted": 0,
        "skipped": 0,
    }

    for index, item in enumerate(fixtures, start=1):
        for side in ("home_team", "away_team"):
            team = upsert_team(db, item[side])
            if team:
                ensure_competition_team_link(db, WORLD_CUP_COMPETITION_ID, team.id)
                summary["teams_upserted"] += 1

        upsert_match(db, item)
        event = upsert_event(db, tournament, item)
        db.flush()
        if ensure_default_match_market(db, tournament, event, item):
            summary["markets_created"] += 1

        summary["fixtures_stored"] += 1
        summary["events_created_or_updated"] += 1

        if index % 12 == 0:
            db.commit()

    db.add(
        ActivityFeed(
            action_type="world_cup_bootstrap",
            description=(
                f"World Cup bootstrap completed: {summary['fixtures_stored']} fixtures "
                f"stored for FIFA World Cup 2026."
            ),
            metadata_json=summary,
        )
    )
    db.commit()
    return summary
