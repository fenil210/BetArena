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
            "crest_url": team.get("crest"),
        })
    return result


async def fetch_fixtures_for_competition(competition_id: int) -> list[dict]:
    """
    Fetch all matches/fixtures for a competition.
    Returns a list of dicts with keys: id, home_team_id, away_team_id,
    kickoff_at, matchday, stage, status.
    """
    data = await _get(f"/competitions/{competition_id}/matches")
    result = []
    for match in data.get("matches", []):
        kickoff = match.get("utcDate")
        result.append({
            "id": match["id"],
            "competition_id": competition_id,
            "home_team_id": match.get("homeTeam", {}).get("id"),
            "away_team_id": match.get("awayTeam", {}).get("id"),
            "kickoff_at": kickoff,
            "matchday": match.get("matchday"),
            "stage": match.get("stage"),
            "status": match.get("status"),
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
