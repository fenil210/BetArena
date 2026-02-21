from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.bet import Bet
from app.models.market import Market, Selection
from app.models.event import Event
from app.schemas.core import LeaderboardEntry

router = APIRouter(tags=["Leaderboard"])


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def global_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Global leaderboard ranked by current coin balance."""
    users = (
        db.query(User)
        .filter(User.is_active == True, User.is_admin == False)
        .order_by(User.balance.desc())
        .all()
    )

    result = []
    for rank, user in enumerate(users, start=1):
        total_bets = db.query(func.count(Bet.id)).filter(Bet.user_id == user.id).scalar() or 0
        won_bets = (
            db.query(func.count(Bet.id))
            .filter(Bet.user_id == user.id, Bet.status == "won")
            .scalar() or 0
        )
        result.append(
            LeaderboardEntry(
                rank=rank,
                user_id=user.id,
                username=user.username,
                balance=user.balance,
                total_bets=total_bets,
                won_bets=won_bets,
            )
        )
    return result


@router.get("/leaderboard/{tournament_id}", response_model=list[LeaderboardEntry])
def tournament_leaderboard(
    tournament_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Per-tournament leaderboard showing profit/loss within that tournament.
    Profit = total winnings - total stakes for bets in this tournament's markets.
    """
    # Get all market IDs for this tournament (both event-level and tournament-level)
    # First get event IDs for this tournament
    event_ids = [
        e.id
        for e in db.query(Event)
        .filter(Event.tournament_id == tournament_id)
        .all()
    ]

    # Markets directly on tournament OR on events within this tournament
    market_query = db.query(Market).filter(
        (Market.tournament_id == tournament_id)
        | (Market.event_id.in_(event_ids) if event_ids else False)
    )
    market_ids = [m.id for m in market_query.all()]

    if not market_ids:
        return []

    # Get all selection IDs for these markets
    selection_ids = [
        s.id
        for s in db.query(Selection)
        .filter(Selection.market_id.in_(market_ids))
        .all()
    ]

    if not selection_ids:
        return []

    # Calculate per-user profit/loss
    users = db.query(User).filter(User.is_active == True, User.is_admin == False).all()
    entries = []

    for user in users:
        user_bets = (
            db.query(Bet)
            .filter(Bet.user_id == user.id, Bet.selection_id.in_(selection_ids))
            .all()
        )
        if not user_bets:
            continue

        total_staked = sum(b.stake for b in user_bets)
        total_won = sum(b.potential_payout for b in user_bets if b.status == "won")
        profit = total_won - total_staked
        total_bets = len(user_bets)
        won_bets = sum(1 for b in user_bets if b.status == "won")

        entries.append(
            LeaderboardEntry(
                rank=0,  # will be set after sorting
                user_id=user.id,
                username=user.username,
                balance=user.balance,
                total_bets=total_bets,
                won_bets=won_bets,
                profit=profit,
            )
        )

    # Sort by profit descending and assign ranks
    entries.sort(key=lambda e: e.profit, reverse=True)
    for i, entry in enumerate(entries):
        entry.rank = i + 1

    return entries
