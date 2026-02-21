from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.market import Market, Selection
from app.models.activity import ActivityFeed
from app.schemas.core import (
    MarketCreate,
    MarketStatusUpdate,
    MarketOut,
    SelectionUpdate,
    SettleMarketRequest,
)
from app.services.betting import settle_market, void_market, BettingError

router = APIRouter(tags=["Markets"])


# ─────────────── Admin: Create market ───────────────

@router.post(
    "/admin/markets",
    response_model=MarketOut,
    status_code=status.HTTP_201_CREATED,
)
def create_market(
    body: MarketCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin creates a market with its selections.
    Must provide at least 2 selections with odds.
    """
    if not body.event_id and not body.tournament_id:
        raise HTTPException(
            status_code=400,
            detail="Market must be linked to an event, a tournament, or both.",
        )

    market = Market(
        event_id=body.event_id,
        tournament_id=body.tournament_id,
        question=body.question,
        market_type=body.market_type,
        status=body.status,
    )
    db.add(market)
    db.flush()  # get market.id

    for sel in body.selections:
        db.add(Selection(
            market_id=market.id,
            label=sel.label,
            odds=sel.odds,
            player_id=sel.player_id,
        ))

    # Activity feed
    db.add(ActivityFeed(
        action_type="market_opened" if body.status == "open" else "market_created",
        description=f"New market: \"{body.question}\" ({body.market_type})",
        metadata_json={"market_id": str(market.id), "market_type": body.market_type},
    ))

    db.commit()
    db.refresh(market)
    return market


# ─────────────── Admin: Update market status ───────────────

@router.patch("/admin/markets/{market_id}/status", response_model=MarketOut)
def update_market_status(
    market_id: str,
    body: MarketStatusUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin transitions market status (e.g., coming_soon → open → locked)."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    # Validate transitions
    valid_transitions = {
        "coming_soon": ["open"],
        "open": ["locked"],
        "locked": ["settled", "voided", "open"],  # can re-open if needed
    }
    allowed = valid_transitions.get(market.status, [])
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{market.status}' to '{body.status}'. Allowed: {allowed}",
        )

    market.status = body.status
    db.commit()
    db.refresh(market)
    return market


# ─────────────── Admin: Update selection odds ───────────────

@router.patch("/admin/selections/{selection_id}")
def update_selection_odds(
    selection_id: str,
    body: SelectionUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin updates odds on a selection (only before market is locked)."""
    selection = db.query(Selection).filter(Selection.id == selection_id).first()
    if not selection:
        raise HTTPException(status_code=404, detail="Selection not found")

    market = db.query(Market).filter(Market.id == selection.market_id).first()
    if market and market.status in ("locked", "settled", "voided"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot update odds on a {market.status} market",
        )

    selection.odds = body.odds
    db.commit()
    return {"message": "Odds updated", "new_odds": str(selection.odds)}


# ─────────────── Admin: Settle market ───────────────

@router.post("/admin/markets/{market_id}/settle")
def settle_market_endpoint(
    market_id: str,
    body: SettleMarketRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin settles a market by picking the winning selection."""
    try:
        result = settle_market(db, market_id, body.winning_selection_id)
    except BettingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ─────────────── Admin: Void market ───────────────

@router.post("/admin/markets/{market_id}/void")
def void_market_endpoint(
    market_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin voids a market — all stakes are refunded."""
    try:
        result = void_market(db, market_id)
    except BettingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ─────────────── Public: List markets for event ───────────────

@router.get("/events/{event_id}/markets", response_model=list[MarketOut])
def list_event_markets(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all markets for a specific event."""
    return (
        db.query(Market)
        .filter(Market.event_id == event_id)
        .order_by(Market.created_at.desc())
        .all()
    )


# ─────────────── Public: List tournament markets ───────────────

@router.get("/tournaments/{tournament_id}/markets", response_model=list[MarketOut])
def list_tournament_markets(
    tournament_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tournament-level markets (winner, golden boot, etc.)."""
    return (
        db.query(Market)
        .filter(
            Market.tournament_id == tournament_id,
            Market.event_id.is_(None),  # only top-level tournament markets
        )
        .order_by(Market.created_at.desc())
        .all()
    )


# ─────────────── Public: Get market detail ───────────────

@router.get("/markets/{market_id}", response_model=MarketOut)
def get_market(
    market_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single market with all its selections."""
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market
