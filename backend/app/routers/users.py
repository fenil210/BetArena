from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.activity import ActivityFeed
from app.models.bet import Bet
from app.models.market import Market, Selection
from app.models.event import Event
from app.models.tournament import Tournament
from app.schemas.user import UserListItem, UserProfile, AdjustBalanceRequest
from app.services.rankings import current_global_rank

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
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Admin accounts do not carry betting coins")

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


# ---------- User Stats & Analytics ----------

@router.get("/users/me/stats")
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed stats for the current user:
    - Win rate over last 30 days
    - Profit/Loss history
    - Favorite teams
    - Betting patterns
    """
    user_id = current_user.id
    
    # Last 30 days win rate
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    recent_bets = (
        db.query(Bet)
        .filter(Bet.user_id == user_id, Bet.placed_at >= thirty_days_ago)
        .all()
    )
    
    settled_recent = [b for b in recent_bets if b.status in ("won", "lost")]
    won_recent = sum(1 for b in settled_recent if b.status == "won")
    recent_win_rate = (won_recent / len(settled_recent) * 100) if settled_recent else 0
    
    # All-time stats
    all_bets = db.query(Bet).filter(Bet.user_id == user_id).all()
    total_bets = len(all_bets)
    open_bets = sum(1 for b in all_bets if b.status == "open")
    won_bets = sum(1 for b in all_bets if b.status == "won")
    lost_bets = sum(1 for b in all_bets if b.status == "lost")
    settled_bets = [b for b in all_bets if b.status in ("won", "lost")]
    all_time_win_rate = (won_bets / len(settled_bets) * 100) if settled_bets else 0
    
    # Calculate settled economics. Open stakes are tracked separately so ROI is not
    # distorted by wagers that have not resolved yet.
    total_staked = sum(b.stake for b in all_bets)
    settled_staked = sum(b.stake for b in settled_bets)
    total_won = sum(b.potential_payout for b in all_bets if b.status == "won")
    total_profit = sum(
        (b.potential_payout - b.stake) if b.status == "won" else -b.stake
        for b in settled_bets
    )
    biggest_win = max(
        (b.potential_payout - b.stake for b in all_bets if b.status == "won"),
        default=0,
    )
    current_rank, movement = current_global_rank(db, user_id)
    
    # Daily P/L for last 30 days (for chart)
    daily_stats = {}
    for bet in recent_bets:
        day = bet.placed_at.astimezone(timezone.utc).strftime("%Y-%m-%d")
        if day not in daily_stats:
            daily_stats[day] = {"profit": 0, "stake": 0}
        daily_stats[day]["stake"] += bet.stake
        if bet.status == "won":
            daily_stats[day]["profit"] += bet.potential_payout - bet.stake
        elif bet.status == "lost":
            daily_stats[day]["profit"] -= bet.stake
    
    daily_chart = [
        {"date": day, "profit": stats["profit"], "stake": stats["stake"]}
        for day, stats in sorted(daily_stats.items())
    ]

    coin_events = []
    for bet in all_bets:
        coin_events.append((bet.placed_at, -bet.stake, "Stake placed"))
        if bet.settled_at:
            if bet.status == "won":
                coin_events.append((bet.settled_at, bet.potential_payout, "Payout credited"))
            elif bet.status in ("voided", "replaced"):
                coin_events.append((bet.settled_at, bet.stake, "Stake returned"))

    adjustments = (
        db.query(ActivityFeed)
        .filter(ActivityFeed.user_id == user_id, ActivityFeed.action_type == "balance_adjusted")
        .all()
    )
    for activity in adjustments:
        amount = (activity.metadata_json or {}).get("amount")
        if isinstance(amount, int):
            coin_events.append((activity.created_at, amount, "Admin adjustment"))

    coin_events.sort(key=lambda item: item[0])
    starting_balance = 0 if current_user.is_admin else 1000
    running_balance = starting_balance
    coin_history = [{
        "date": current_user.created_at,
        "balance": starting_balance,
        "delta": 0,
        "label": "Starting balance",
    }]
    for date, delta, label in coin_events:
        running_balance += delta
        coin_history.append({
            "date": date,
            "balance": running_balance,
            "delta": delta,
            "label": label,
        })

    if not coin_history or coin_history[-1]["balance"] != current_user.balance:
        coin_history.append({
            "date": datetime.now(timezone.utc),
            "balance": current_user.balance,
            "delta": current_user.balance - running_balance,
            "label": "Current balance",
        })
    
    return {
        "summary": {
            "total_bets": total_bets,
            "open_bets": open_bets,
            "won_bets": won_bets,
            "lost_bets": lost_bets,
            "win_rate": round(all_time_win_rate, 1),
            "recent_win_rate": round(recent_win_rate, 1),
            "total_staked": total_staked,
            "settled_staked": settled_staked,
            "total_won": total_won,
            "total_profit": total_profit,
            "biggest_win": biggest_win,
            "current_rank": current_rank,
            "previous_rank": movement.previous_rank if movement else None,
            "rank_change": movement.rank_change if movement else 0,
            "rank_movement": movement.movement if movement else "same",
            "roi": round((total_profit / settled_staked * 100), 1) if settled_staked > 0 else 0,
        },
        "daily_chart": daily_chart,
        "coin_history": coin_history[-20:],
    }


@router.get("/users/me/streak")
def get_user_streak(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current winning streak for the user.
    Returns current streak count and best streak ever.
    """
    # Get all settled bets ordered by settlement time
    settled_bets = (
        db.query(Bet)
        .filter(
            Bet.user_id == current_user.id,
            Bet.status.in_(["won", "lost"])
        )
        .order_by(Bet.settled_at.desc())
        .all()
    )
    
    # Calculate current streak
    current_streak = 0
    for bet in settled_bets:
        if bet.status == "won":
            current_streak += 1
        else:
            break
    
    # Calculate best streak ever
    best_streak = 0
    current_temp = 0
    for bet in reversed(settled_bets):  # Oldest first
        if bet.status == "won":
            current_temp += 1
            best_streak = max(best_streak, current_temp)
        else:
            current_temp = 0
    
    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "total_settled": len(settled_bets),
    }
