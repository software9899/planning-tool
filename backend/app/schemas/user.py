"""
User schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    name: str
    email: str
    role: str
    position: Optional[str] = None
    line_manager: Optional[int] = None
    status: str = "active"
    avatar_url: Optional[str]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    computer: Optional[str] = None
    mobile: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    disc_type: Optional[str] = None
    personality_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request"""
    email: str


class ResetPasswordRequest(BaseModel):
    """Schema for reset password request"""
    token: str
    new_password: str
