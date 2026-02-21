from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.activity import ActivityFeed
from app.schemas.user import UserListItem, UserProfile, AdjustBalanceRequest

router = APIRouter(tags=["Users"])


# ---------- Admin: List all users ----------

@router.get("/admin/users", response_model=list[UserListItem])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin lists all user accounts."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


# ---------- Admin: Adjust balance ----------

@router.post("/admin/users/{user_id}/adjust-balance")
def adjust_balance(
    user_id: str,
    body: AdjustBalanceRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin adjusts a user's virtual coin balance (positive = top-up, negative = deduct)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_balance = user.balance + body.amount
    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Resulting balance would be negative ({new_balance})",
        )

    user.balance = new_balance
    db.add(
        ActivityFeed(
            user_id=user.id,
            action_type="balance_adjusted",
            description=f"{admin.username} adjusted {user.username}'s balance by {body.amount:+d} coins. Reason: {body.reason or 'N/A'}",
            metadata_json={"amount": body.amount, "new_balance": new_balance, "reason": body.reason},
        )
    )
    db.commit()
    return {"message": f"Balance adjusted to {new_balance}", "new_balance": new_balance}


# ---------- Admin: Deactivate user ----------

@router.post("/admin/users/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin deactivates a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.username} deactivated"}


# ---------- Admin: Reactivate user ----------

@router.post("/admin/users/{user_id}/activate")
def activate_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin reactivates a deactivated user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": f"User {user.username} activated"}
