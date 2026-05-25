"""
Football-data.org API service.

All external API interaction is contained here. Route handlers never call
the external API directly. Data is mapped to internal Pydantic schemas before
being returned to the caller.
"""

import logging
from datetime import datetime, timezone

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.FOOTBALL_API_BASE_URL
HEADERS = {"X-Auth-Token": settings.FOOTBALL_API_KEY}
TIMEOUT = 15.0  # seconds
WORLD_CUP_COMPETITION_ID = 2000
WORLD_CUP_COMPETITION_CODE = "WC"
WORLD_CUP_SEASON = 2026


class FootballAPIError(Exception):
    """Raised when the external API returns an error or is unreachable."""
    pass


async def _get(path: str) -> dict:
    """Make a GET request to football-data.org and return parsed JSON."""
    url = f"{BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
        except httpx.RequestError as e:
            raise FootballAPIError(f"Network error reaching football-data.org: {e}")

        if resp.status_code == 429:
            raise FootballAPIError(
                "Rate limit exceeded on football-data.org (100 requests/day). "
                "Try again later."
            )
        if resp.status_code != 200:
            raise FootballAPIError(
                f"football-data.org returned HTTP {resp.status_code}: {resp.text[:300]}"
            )
        return resp.json()


def _parse_utc_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _map_team(team: dict) -> dict:
    return {
        "id": team.get("id"),
        "name": team.get("name"),
        "short_name": team.get("shortName"),
        "tla": team.get("tla"),
        "crest_url": team.get("crest"),
    }


def _map_score(score: dict | None) -> dict | None:
    if not score:
        return None
    return {
        "winner": score.get("winner"),
        "duration": score.get("duration"),
        "full_time": score.get("fullTime"),
        "half_time": score.get("halfTime"),
    }


# ─────────────── Public functions ───────────────


async def fetch_competitions() -> list[dict]:
    """
    Fetch all available competitions.
    Returns a list of dicts with keys: id, name, code, emblem_url.
    """
    data = await _get("/competitions")
    result = []
    for comp in data.get("competitions", []):
        result.append({
            "id": comp["id"],
            "name": comp["name"],
            "code": comp.get("code"),
            "emblem_url": comp.get("emblem"),
        })
    return result


async def fetch_world_cup_competition() -> dict:
    """Fetch FIFA World Cup competition metadata."""
    comp = await _get(f"/competitions/{WORLD_CUP_COMPETITION_CODE}")
    return {
        "id": comp["id"],
        "name": comp["name"],
        "code": comp.get("code"),
        "emblem_url": comp.get("emblem"),
        "current_season": comp.get("currentSeason"),
        "seasons": comp.get("seasons", []),
        "last_updated": comp.get("lastUpdated"),
    }


async def fetch_teams_for_competition(competition_id: int) -> list[dict]:
    """
    Fetch all teams in a competition.
    Returns a list of dicts with keys: id, name, short_name, crest_url.
    """
    data = await _get(f"/competitions/{competition_id}/teams")
    result = []
    for team in data.get("teams", []):
        result.append({
            "id": team["id"],
            "name": team["name"],
            "short_name": team.get("shortName"),
            "tla": team.get("tla"),
            "crest_url": team.get("crest"),
        })
    return result


async def fetch_fixtures_for_competition(
    competition_id: int,
    season: int | None = None,
    stage: str | None = None,
) -> list[dict]:
    """
    Fetch all matches/fixtures for a competition.
    Returns a list of dicts with keys: id, home_team_id, away_team_id,
    kickoff_at, matchday, stage, status.
    """
    params = []
    if season:
        params.append(f"season={season}")
    if stage:
        params.append(f"stage={stage}")
    query = f"?{'&'.join(params)}" if params else ""
    data = await _get(f"/competitions/{competition_id}/matches{query}")
    result = []
    for match in data.get("matches", []):
        home_team = _map_team(match.get("homeTeam", {}))
        away_team = _map_team(match.get("awayTeam", {}))
        score = _map_score(match.get("score"))
        result.append({
            "id": match["id"],
            "competition_id": competition_id,
            "home_team": home_team,
            "away_team": away_team,
            "home_team_id": home_team.get("id"),
            "away_team_id": away_team.get("id"),
            "kickoff_at": _parse_utc_datetime(match.get("utcDate")),
            "matchday": match.get("matchday"),
            "stage": match.get("stage"),
            "group": match.get("group"),
            "venue": match.get("venue"),
            "status": match.get("status"),
            "last_updated": _parse_utc_datetime(match.get("lastUpdated")),
            "score": score,
            "metadata_json": {
                "area": match.get("area"),
                "season": match.get("season"),
                "score": score,
                "minute": match.get("minute"),
                "injury_time": match.get("injuryTime"),
                "attendance": match.get("attendance"),
                "referees": match.get("referees", []),
            },
        })
    return result


async def fetch_squad_for_team(team_id: int) -> list[dict]:
    """
    Fetch the current squad for a team.
    Returns a list of dicts with keys: id, name, position, nationality, date_of_birth.
    """
    data = await _get(f"/teams/{team_id}")
    result = []
    for player in data.get("squad", []):
        result.append({
            "id": player["id"],
            "team_id": team_id,
            "name": player["name"],
            "position": player.get("position"),
            "nationality": player.get("nationality"),
            "date_of_birth": player.get("dateOfBirth"),
        })
    return result


async def fetch_matches_for_matchday(
    competition_id: int, 
    matchday: int | None = None,
    stage: str | None = None,
    group: str | None = None
) -> list[dict]:
    """
    Fetch all matches for a specific competition with optional filters.
    
    For league competitions: use matchday (e.g., 27 for Serie A)
    For cup competitions: use stage (e.g., 'GROUP_STAGE', 'LAST_16', 'QUARTER_FINALS')
    For World Cup groups: use stage='GROUP_STAGE' + group (e.g., 'GROUP_A')
    
    Returns a list of dicts with keys: id, home_team, away_team, kickoff_at, 
    status, matchday, stage, group.
    """
    # Build query parameters
    params = []
    if matchday is not None:
        params.append(f"matchday={matchday}")
    if stage:
        params.append(f"stage={stage}")
    if group:
        params.append(f"group={group}")
    
    query_string = "&".join(params) if params else ""
    url = f"/competitions/{competition_id}/matches"
    if query_string:
        url += f"?{query_string}"
    
    data = await _get(url)
    result = []
    for match in data.get("matches", []):
        home_team = match.get("homeTeam", {})
        away_team = match.get("awayTeam", {})
        result.append({
            "id": match["id"],
            "home_team": _map_team(home_team),
            "away_team": _map_team(away_team),
            "kickoff_at": _parse_utc_datetime(match.get("utcDate")),
            "status": match.get("status"),
            "matchday": match.get("matchday"),
            "stage": match.get("stage"),
            "group": match.get("group"),
            "venue": match.get("venue"),
            "last_updated": _parse_utc_datetime(match.get("lastUpdated")),
            "score": _map_score(match.get("score")),
        })
    return result


async def fetch_competition_stages(competition_id: int) -> list[str]:
    """
    Fetch available stages for a competition from current season.
    Returns list of stage names like ['GROUP_STAGE', 'LAST_16', etc.]
    """
    try:
        data = await _get(f"/competitions/{competition_id}")
        current_season = data.get("currentSeason", {})
        return current_season.get("stages", [])
    except FootballAPIError:
        return []


async def fetch_competition_standings(competition_id: int) -> dict | None:
    """
    Fetch current standings for a competition to get current matchday info.
    Returns dict with current_matchday or None if not available.
    """
    try:
        data = await _get(f"/competitions/{competition_id}")
        current_season = data.get("currentSeason", {})
        return {
            "current_matchday": current_season.get("currentMatchday"),
            "season_start": current_season.get("startDate"),
            "season_end": current_season.get("endDate"),
        }
    except FootballAPIError:
        return None
