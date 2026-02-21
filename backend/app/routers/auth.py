from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt

from app.config import settings
from app.database import SessionLocal
from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    CreateUserRequest,
    ChangePasswordRequest,
)
from app.schemas.user import UserProfile

router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRE_MINUTES
    )
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ---------- Login ----------

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password, returns JWT."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )
    token = _create_access_token(str(user.id))
    return TokenResponse(access_token=token)


# ---------- Me ----------

@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the authenticated user's profile."""
    total = len(current_user.bets)
    won = sum(1 for b in current_user.bets if b.status == "won")
    lost = sum(1 for b in current_user.bets if b.status == "lost")
    win_rate = (won / total * 100) if total > 0 else 0.0
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        balance=current_user.balance,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        total_bets=total,
        won_bets=won,
        lost_bets=lost,
        win_rate=round(win_rate, 1),
    )


# ---------- Change Password ----------

@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Let a user change their own password."""
    if not _verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.password_hash = _hash_password(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ---------- Admin: Create User ----------

@router.post("/users", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates a new user account."""
    # Check for duplicate
    existing = (
        db.query(User)
        .filter((User.email == body.email) | (User.username == body.username))
        .first()
    )
    if existing:
        field = "email" if existing.email == body.email else "username"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with this {field} already exists",
        )

    user = User(
        username=body.username,
        email=body.email,
        password_hash=_hash_password(body.password),
        balance=settings.DEFAULT_BALANCE,
        is_admin=body.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        balance=user.balance,
        is_admin=user.is_admin,
        is_active=user.is_active,
        created_at=user.created_at,
    )
