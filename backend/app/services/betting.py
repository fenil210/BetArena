"""
Betting service — handles bet placement (atomic), settlement, and voiding.
All balance mutations happen inside database transactions here.
"""

import math
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.market import Market, Selection
from app.models.bet import Bet
from app.models.activity import ActivityFeed

logger = logging.getLogger(__name__)


class BettingError(Exception):
    """Raised when a betting operation fails a business rule."""
    pass


def place_bet(db: Session, user: User, selection_id, stake: int) -> Bet:
    """
    Place a bet atomically: deduct balance and create bet record in one transaction.

    Raises BettingError if:
    - Selection or market not found
    - Market is not open
    - Insufficient balance
    - Stake is not positive
    """
    if stake <= 0:
        raise BettingError("Stake must be a positive number")

    # Load selection with market
    selection = db.query(Selection).filter(Selection.id == selection_id).first()
    if not selection:
        raise BettingError("Selection not found")

    market = db.query(Market).filter(Market.id == selection.market_id).first()
    if not market:
        raise BettingError("Market not found")

    if market.status != "open":
        raise BettingError(f"Market is not open for betting (status: {market.status})")

    # Refresh user to get latest balance (for-update lock in real PostgreSQL)
    db.refresh(user)

    # ── One-bet-per-market rule ──────────────────────────────────────
    # If user already has an open bet on ANY selection in this market,
    # cancel (refund) it before placing the new one.
    all_selection_ids = [
        s.id for s in db.query(Selection).filter(Selection.market_id == market.id).all()
    ]
    existing_bet = (
        db.query(Bet)
        .filter(
            Bet.user_id == user.id,
            Bet.selection_id.in_(all_selection_ids),
            Bet.status == "open",
        )
        .first()
    )

    if existing_bet:
        # Refund the old stake
        user.balance += existing_bet.stake
        existing_bet.status = "replaced"
        existing_bet.settled_at = datetime.now(timezone.utc)
        logger.info(
            f"Replacing bet {existing_bet.id} (stake={existing_bet.stake}) "
            f"for user {user.username} on market {market.id}"
        )
    # ────────────────────────────────────────────────────────────────

    if user.balance < stake:
        raise BettingError(
            f"Insufficient balance. Current: {user.balance}, attempted stake: {stake}"
        )

    # Calculate payout — floor to nearest integer (house advantage)
    potential_payout = math.floor(float(selection.odds) * stake)

    # Atomic: deduct balance + create bet in single transaction
    user.balance -= stake
    bet = Bet(
        user_id=user.id,
        selection_id=selection.id,
        stake=stake,
        potential_payout=potential_payout,
        status="open",
    )
    db.add(bet)

    # Activity feed — show replacement context if applicable
    if existing_bet:
        desc = (
            f"{user.username} changed bet to {stake} coins on \"{selection.label}\" "
            f"in \"{market.question}\" (was {existing_bet.stake} coins)"
        )
    else:
        desc = f"{user.username} placed {stake} coins on \"{selection.label}\" in \"{market.question}\""

    db.add(
        ActivityFeed(
            user_id=user.id,
            action_type="bet_placed",
            description=desc,
            metadata_json={
                "stake": stake,
                "odds": str(selection.odds),
                "potential_payout": potential_payout,
                "market_id": str(market.id),
                "selection_label": selection.label,
                "replaced_bet_id": str(existing_bet.id) if existing_bet else None,
            },
        )
    )

    db.commit()
    db.refresh(bet)
    return bet


def settle_market(db: Session, market_id, winning_selection_id) -> dict:
    """
    Settle a market by picking the winning selection.
    - Winning bets get credited with potential_payout.
    - Losing bets are marked as lost.
    - Market status -> settled.

    Returns a summary dict.
    """
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise BettingError("Market not found")

    if market.status not in ("open", "locked"):
        raise BettingError(
            f"Cannot settle a market with status '{market.status}'. Must be 'open' or 'locked'."
        )

    winning_selection = (
        db.query(Selection)
        .filter(Selection.id == winning_selection_id, Selection.market_id == market_id)
        .first()
    )
    if not winning_selection:
        raise BettingError("Winning selection not found in this market")

    now = datetime.now(timezone.utc)
    winners_paid = 0
    losers_marked = 0
    total_credited = 0

    # Mark winner
    winning_selection.is_winner = True

    # Process all selections in the market
    for sel in market.selections:
        for bet in sel.bets:
            if bet.status != "open":
                continue  # skip already-settled bets

            if sel.id == winning_selection.id:
                # Winner
                bet.status = "won"
                bet.settled_at = now
                # Credit user
                user = db.query(User).filter(User.id == bet.user_id).first()
                if user:
                    user.balance += bet.potential_payout
                    total_credited += bet.potential_payout
                winners_paid += 1
            else:
                # Loser — mark losing selections
                sel.is_winner = False
                bet.status = "lost"
                bet.settled_at = now
                losers_marked += 1

    market.status = "settled"

    # Activity feed
    db.add(
        ActivityFeed(
            action_type="market_settled",
            description=f"Market \"{market.question}\" settled. Winner: \"{winning_selection.label}\"",
            metadata_json={
                "market_id": str(market.id),
                "winning_selection": winning_selection.label,
                "winners_paid": winners_paid,
                "total_credited": total_credited,
            },
        )
    )

    db.commit()
    return {
        "winners_paid": winners_paid,
        "losers_marked": losers_marked,
        "total_credited": total_credited,
    }


def void_market(db: Session, market_id) -> dict:
    """
    Void a market: refund all stakes to users, mark all bets as voided.
    """
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise BettingError("Market not found")

    if market.status == "settled":
        raise BettingError("Cannot void an already settled market")

    now = datetime.now(timezone.utc)
    refunded_count = 0
    total_refunded = 0

    for sel in market.selections:
        for bet in sel.bets:
            if bet.status != "open":
                continue

            bet.status = "voided"
            bet.settled_at = now
            # Refund stake
            user = db.query(User).filter(User.id == bet.user_id).first()
            if user:
                user.balance += bet.stake
                total_refunded += bet.stake
            refunded_count += 1

    market.status = "voided"

    # Activity feed
    db.add(
        ActivityFeed(
            action_type="market_voided",
            description=f"Market \"{market.question}\" voided. All stakes refunded.",
            metadata_json={
                "market_id": str(market.id),
                "refunded_count": refunded_count,
                "total_refunded": total_refunded,
            },
        )
    )

    db.commit()
    return {"refunded_count": refunded_count, "total_refunded": total_refunded}
