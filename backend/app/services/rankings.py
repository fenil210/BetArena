from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.bet import Bet
from app.models.event import Event
from app.models.market import Market, Selection
from app.models.user import User


@dataclass
class RankMovement:
    previous_rank: int | None
    rank_change: int
    movement: str


def movement_label(rank_change: int) -> str:
    if rank_change > 0:
        return "up"
    if rank_change < 0:
        return "down"
    return "same"


def global_rank_movements(db: Session) -> dict[UUID, RankMovement]:
    users = (
        db.query(User)
        .filter(User.is_active == True, User.is_admin == False)
        .order_by(User.balance.desc(), User.username.asc())
        .all()
    )
    current_ranks = {user.id: index + 1 for index, user in enumerate(users)}
    previous_balances = {user.id: user.balance for user in users}

    latest_settlement = (
        db.query(func.max(Bet.settled_at))
        .filter(Bet.status.in_(["won", "lost", "voided", "replaced"]))
        .scalar()
    )

    if latest_settlement:
        settled_bets = (
            db.query(Bet)
            .filter(Bet.settled_at == latest_settlement)
            .all()
        )
        for bet in settled_bets:
            if bet.user_id not in previous_balances:
                continue
            if bet.status == "won":
                previous_balances[bet.user_id] -= bet.potential_payout
            elif bet.status in ("voided", "replaced"):
                previous_balances[bet.user_id] -= bet.stake

    previous_order = sorted(
        users,
        key=lambda user: (-previous_balances[user.id], user.username.lower()),
    )
    previous_ranks = {user.id: index + 1 for index, user in enumerate(previous_order)}

    return {
        user.id: RankMovement(
            previous_rank=previous_ranks.get(user.id),
            rank_change=(previous_ranks.get(user.id) or current_ranks[user.id]) - current_ranks[user.id],
            movement=movement_label((previous_ranks.get(user.id) or current_ranks[user.id]) - current_ranks[user.id]),
        )
        for user in users
    }


def current_global_rank(db: Session, user_id: UUID) -> tuple[int | None, RankMovement | None]:
    users = (
        db.query(User)
        .filter(User.is_active == True, User.is_admin == False)
        .order_by(User.balance.desc(), User.username.asc())
        .all()
    )
    movements = global_rank_movements(db)
    for index, user in enumerate(users, start=1):
        if user.id == user_id:
            return index, movements.get(user.id)
    return None, None


def tournament_selection_ids(db: Session, tournament_id: str) -> list[UUID]:
    event_ids = [
        event.id
        for event in db.query(Event).filter(Event.tournament_id == tournament_id).all()
    ]
    market_query = db.query(Market).filter(
        (Market.tournament_id == tournament_id)
        | (Market.event_id.in_(event_ids) if event_ids else False)
    )
    market_ids = [market.id for market in market_query.all()]
    if not market_ids:
        return []
    return [
        selection.id
        for selection in db.query(Selection).filter(Selection.market_id.in_(market_ids)).all()
    ]


def bet_profit(bet: Bet) -> int:
    if bet.status == "won":
        return bet.potential_payout - bet.stake
    if bet.status == "lost":
        return -bet.stake
    return 0


def settlement_profit_delta(bet: Bet) -> int:
    if bet.status == "won":
        return bet.potential_payout
    if bet.status in ("voided", "replaced"):
        return bet.stake
    return 0
