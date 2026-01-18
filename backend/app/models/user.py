"""
User model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.utils.database import Base


class User(Base):
    """User model for authentication and profile"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    tenant_role = Column(String(50), default="member")
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255))
    role = Column(String(50), default="member")
    position = Column(String(255), nullable=True)
    line_manager = Column(Integer, nullable=True)
    status = Column(String(50), default="active")
    avatar_url = Column(Text)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    computer = Column(String(255), nullable=True)
    mobile = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    birthday = Column(String(50), nullable=True)
    disc_type = Column(String(10), nullable=True)
    personality_type = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    """Password reset token model"""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
