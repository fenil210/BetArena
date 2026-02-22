from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.activity import ActivityFeed, Notification
from app.schemas.core import ActivityOut, NotificationOut

router = APIRouter(tags=["Feed & Notifications"])


# ─────────────── Activity Feed ───────────────

@router.get("/feed", response_model=list[ActivityOut])
def get_feed(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the social activity feed — recent bets, settlements, etc."""
    activities = (
        db.query(ActivityFeed)
        .order_by(ActivityFeed.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Enrich with usernames
    result = []
    for a in activities:
        out = ActivityOut(
            id=a.id,
            user_id=a.user_id,
            action_type=a.action_type,
            description=a.description,
            metadata_json=a.metadata_json,
            created_at=a.created_at,
            username=a.user.username if a.user else None,
        )
        result.append(out)
    return result


# ─────────────── Notifications ───────────────

@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's notifications."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/notifications/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of unread notifications."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .count()
    )
    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        return {"message": "Notification not found"}
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
