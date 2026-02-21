from pydantic import BaseModel, EmailStr, Field


# ---------- Auth Request Schemas ----------

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=4, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=6, max_length=128)


# ---------- Admin: Create User ----------

class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=4, max_length=128)
    is_admin: bool = False
