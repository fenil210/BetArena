from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.bet import Bet
from app.models.market import Selection
from app.schemas.core import BetCreate, BetOut
from app.services.betting import place_bet, BettingError

router = APIRouter(tags=["Bets"])


# ─────────────── User: Place bet ───────────────

@router.post("/bets", response_model=BetOut, status_code=201)
def create_bet(
    body: BetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Place a bet on a selection. Atomic: deducts balance and creates bet record."""
    try:
        bet = place_bet(db, current_user, body.selection_id, body.stake)
    except BettingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Re-query with relationships loaded for response
    bet = (
        db.query(Bet)
        .options(selectinload(Bet.selection).selectinload(Selection.market))
        .filter(Bet.id == bet.id)
        .first()
    )
    return bet


# ─────────────── User: My bets ───────────────

@router.get("/bets/me", response_model=list[BetOut])
def get_my_bets(
    status: str | None = Query(None, description="Filter: open, won, lost, voided"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's bets, optionally filtered by status."""
    query = (
        db.query(Bet)
        .options(selectinload(Bet.selection).selectinload(Selection.market))
        .filter(Bet.user_id == current_user.id)
    )
    if status:
        query = query.filter(Bet.status == status)
    else:
        # By default hide replaced bets — user only sees their latest per market
        query = query.filter(Bet.status != "replaced")
    return query.order_by(Bet.placed_at.desc()).all()



# ─────────────── Admin: View bets on a market ───────────────

@router.get("/admin/markets/{market_id}/bets", response_model=list[BetOut])
def get_market_bets(
    market_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin views all bets placed on a specific market (via its selections)."""
    from app.models.market import Selection

    selection_ids = [
        s.id
        for s in db.query(Selection).filter(Selection.market_id == market_id).all()
    ]
    if not selection_ids:
        return []
    return (
        db.query(Bet)
        .filter(Bet.selection_id.in_(selection_ids))
        .order_by(Bet.placed_at.desc())
        .all()
    )
