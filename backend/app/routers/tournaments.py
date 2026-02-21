from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.tournament import Tournament
from app.schemas.core import TournamentCreate, TournamentUpdate, TournamentOut

router = APIRouter(tags=["Tournaments"])


# ─────────────── Admin: Create tournament ───────────────

@router.post(
    "/admin/tournaments",
    response_model=TournamentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_tournament(
    body: TournamentCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates a new tournament linked to a competition."""
    tournament = Tournament(
        name=body.name,
        competition_id=body.competition_id,
    )
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


# ─────────────── Admin: Update tournament status ───────────────

@router.patch("/admin/tournaments/{tournament_id}", response_model=TournamentOut)
def update_tournament(
    tournament_id: str,
    body: TournamentUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin updates tournament status."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    tournament.status = body.status
    db.commit()
    db.refresh(tournament)
    return tournament


# ─────────────── Public: List tournaments ───────────────

@router.get("/tournaments", response_model=list[TournamentOut])
def list_tournaments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tournaments."""
    return (
        db.query(Tournament)
        .order_by(Tournament.created_at.desc())
        .all()
    )


# ─────────────── Public: Get tournament detail ───────────────

@router.get("/tournaments/{tournament_id}", response_model=TournamentOut)
def get_tournament(
    tournament_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single tournament with its details."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament
