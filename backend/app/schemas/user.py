import uuid
from datetime import datetime
from pydantic import BaseModel


class UserProfile(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    balance: int
    is_admin: bool
    is_active: bool
    created_at: datetime
    total_bets: int = 0
    won_bets: int = 0
    lost_bets: int = 0
    win_rate: float = 0.0

    model_config = {"from_attributes": True}


class UserListItem(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    balance: int
    is_admin: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdjustBalanceRequest(BaseModel):
    amount: int  # positive to add, negative to deduct
    reason: str = ""
