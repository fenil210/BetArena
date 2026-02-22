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

    # Get event/tournament info for better messaging
    event_title = None
    tournament_name = None
    if body.event_id:
        from app.models.event import Event
        event = db.query(Event).filter(Event.id == body.event_id).first()
        if event:
            event_title = event.title
    if body.tournament_id:
        from app.models.tournament import Tournament
        tournament = db.query(Tournament).filter(Tournament.id == body.tournament_id).first()
        if tournament:
            tournament_name = tournament.name

    # Build context string (e.g., "Barça vs Levante" or "Premier League")
    context = event_title or tournament_name or "Unknown"
    
    # Activity feed with event name
    db.add(ActivityFeed(
        action_type="market_opened" if body.status == "open" else "market_created",
        description=f"New market for {context}: \"{body.question}\"",
        metadata_json={
            "market_id": str(market.id), 
            "market_type": body.market_type,
            "event_title": event_title,
            "tournament_name": tournament_name,
            "event_id": str(body.event_id) if body.event_id else None,
        },
    ))

    # Create notifications for ALL users about new market
    if body.status == "open":
        from app.models.user import User
        from app.models.activity import Notification
        
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            link_path = f"/events/{body.event_id}" if body.event_id else f"/tournaments/{body.tournament_id}"
            db.add(Notification(
                user_id=user.id,
                type="new_market",
                title="New Betting Market",
                message=f"New market added for {context}: {body.question}",
                link=link_path,
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


# ─────────────── Admin: List ALL markets for tournament ───────────────

@router.get("/admin/tournaments/{tournament_id}/all-markets", response_model=list[MarketOut])
def list_all_tournament_markets(
    tournament_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin: List ALL markets for a tournament including:
    - Tournament-level markets (winner, top scorer, etc.)
    - All event/match-level markets
    
    Sorted by creation date (newest first).
    """
    return (
        db.query(Market)
        .filter(Market.tournament_id == tournament_id)
        .order_by(Market.created_at.desc())
        .all()
    )


# ─────────────── Public: Get betting trends for a market ───────────────

@router.get("/markets/{market_id}/trends")
def get_market_trends(
    market_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get betting trends for a market - shows percentage of bets on each selection.
    Returns: { selection_id, label, percentage, bet_count, total_bets }
    """
    market = db.query(Market).filter(Market.id == market_id).first()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    # Count total bets on this market (via selections)
    from app.models.bet import Bet
    
    total_bets = (
        db.query(Bet)
        .join(Selection)
        .filter(Selection.market_id == market_id)
        .count()
    )
    
    if total_bets == 0:
        # No bets yet - return 0% for all
        return {
            "market_id": market_id,
            "total_bets": 0,
            "trends": [
                {
                    "selection_id": str(sel.id),
                    "label": sel.label,
                    "percentage": 0,
                    "bet_count": 0,
                }
                for sel in market.selections
            ],
        }
    
    # Count bets per selection
    trends = []
    for sel in market.selections:
        bet_count = (
            db.query(Bet)
            .filter(Bet.selection_id == sel.id)
            .count()
        )
        percentage = round((bet_count / total_bets) * 100, 1)
        trends.append({
            "selection_id": str(sel.id),
            "label": sel.label,
            "percentage": percentage,
            "bet_count": bet_count,
        })
    
    return {
        "market_id": market_id,
        "total_bets": total_bets,
        "trends": trends,
    }
