from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.bet import Bet
from app.models.market import Market, Selection
from app.models.event import Event
from app.schemas.core import LeaderboardEntry
from app.services.rankings import bet_profit, global_rank_movements, movement_label, settlement_profit_delta

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
        .order_by(User.balance.desc(), User.username.asc())
        .all()
    )

    result = []
    movements = global_rank_movements(db)
    for rank, user in enumerate(users, start=1):
        total_bets = db.query(func.count(Bet.id)).filter(Bet.user_id == user.id).scalar() or 0
        won_bets = (
            db.query(func.count(Bet.id))
            .filter(Bet.user_id == user.id, Bet.status == "won")
            .scalar() or 0
        )
        movement = movements.get(user.id)
        result.append(
            LeaderboardEntry(
                rank=rank,
                user_id=user.id,
                username=user.username,
                balance=user.balance,
                total_bets=total_bets,
                won_bets=won_bets,
                previous_rank=movement.previous_rank if movement else rank,
                rank_change=movement.rank_change if movement else 0,
                movement=movement.movement if movement else "same",
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

        profit = sum(bet_profit(bet) for bet in user_bets)
        total_bets = len(user_bets)
        won_bets = sum(1 for b in user_bets if b.status == "won")

        entries.append(
            {
                "user": user,
                "profit": profit,
                "total_bets": total_bets,
                "won_bets": won_bets,
                "bets": user_bets,
            }
        )

    # Sort by profit descending and assign ranks
    entries.sort(key=lambda e: (-e["profit"], e["user"].username.lower()))
    current_ranks = {entry["user"].id: index + 1 for index, entry in enumerate(entries)}

    latest_settlement = (
        db.query(func.max(Bet.settled_at))
        .filter(Bet.selection_id.in_(selection_ids), Bet.status.in_(["won", "lost", "voided", "replaced"]))
        .scalar()
    )
    previous_profit = {entry["user"].id: entry["profit"] for entry in entries}
    if latest_settlement:
        latest_bets = (
            db.query(Bet)
            .filter(Bet.selection_id.in_(selection_ids), Bet.settled_at == latest_settlement)
            .all()
        )
        for bet in latest_bets:
            if bet.user_id in previous_profit:
                previous_profit[bet.user_id] -= settlement_profit_delta(bet)

    previous_order = sorted(
        entries,
        key=lambda entry: (-previous_profit[entry["user"].id], entry["user"].username.lower()),
    )
    previous_ranks = {entry["user"].id: index + 1 for index, entry in enumerate(previous_order)}

    return [
        LeaderboardEntry(
            rank=index + 1,
            user_id=entry["user"].id,
            username=entry["user"].username,
            balance=entry["user"].balance,
            total_bets=entry["total_bets"],
            won_bets=entry["won_bets"],
            profit=entry["profit"],
            previous_rank=previous_ranks.get(entry["user"].id),
            rank_change=(previous_ranks.get(entry["user"].id) or current_ranks[entry["user"].id]) - current_ranks[entry["user"].id],
            movement=movement_label((previous_ranks.get(entry["user"].id) or current_ranks[entry["user"].id]) - current_ranks[entry["user"].id]),
        )
        for index, entry in enumerate(entries)
    ]
