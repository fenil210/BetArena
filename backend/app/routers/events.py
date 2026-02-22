from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.event import Event
from app.models.market import Market, Selection
from app.models.bet import Bet
from app.models.tournament import Tournament
from app.schemas.core import EventCreate, EventUpdate, EventOut

router = APIRouter(tags=["Events"])


# ─────────────── Admin: Create event ───────────────

@router.post(
    "/admin/events",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    body: EventCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates a new event (match) within a tournament."""
    # Validate tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == body.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    event = Event(
        tournament_id=body.tournament_id,
        match_id=body.match_id,
        title=body.title,
        description=body.description,
        starts_at=body.starts_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ─────────────── Admin: Update event status ───────────────

@router.patch("/admin/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    body: EventUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin updates event status (upcoming → live → completed → cancelled)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = body.status
    db.commit()
    db.refresh(event)
    return event


# ─────────────── Admin: Delete event ───────────────

@router.delete("/admin/events/{event_id}", status_code=status.HTTP_200_OK)
def delete_event(
    event_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin deletes an event. Voids all open bets (refunds stakes),
    then cascade-deletes markets, selections, and the event itself."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    voided_count = 0
    refunded_total = 0

    # For each market on this event, void open bets and refund
    for market in event.markets:
        for selection in market.selections:
            for bet in selection.bets:
                if bet.status == "open":
                    bet.user.balance += bet.stake
                    refunded_total += bet.stake
                    voided_count += 1
                db.delete(bet)
            db.delete(selection)
        db.delete(market)

    db.delete(event)
    db.commit()

    return {
        "message": f"Event '{event.title}' deleted",
        "bets_voided": voided_count,
        "coins_refunded": refunded_total,
    }


# ─────────────── Public: List events for tournament ───────────────

@router.get("/tournaments/{tournament_id}/events", response_model=list[EventOut])
def list_events(
    tournament_id: str,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all events for a tournament.
    
    Query params:
    - status: Filter by status (upcoming, live, completed, cancelled)
              If not provided, defaults to showing upcoming + live only
    
    Ordered by creation date (newest first) so recently added matches appear first.
    """
    query = db.query(Event).filter(Event.tournament_id == tournament_id)
    
    # Default filter: only show upcoming and live (hide completed/cancelled)
    if status:
        query = query.filter(Event.status == status)
    else:
        # Default: show only upcoming and live events
        query = query.filter(Event.status.in_(["upcoming", "live"]))
    
    # Order by creation date (newest first) - recently added matches first
    return query.order_by(Event.created_at.desc()).all()


# ─────────────── Public: Get event detail ───────────────

@router.get("/events/{event_id}", response_model=EventOut)
def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single event with its details."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

