"""
Team related models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from app.utils.database import Base


class Team(Base):
    """Team model"""
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(10), nullable=True)
    description = Column(Text, nullable=True)
    lead_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TeamMember(Base):
    """Team membership model"""
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Unique constraint to prevent duplicate memberships
    __table_args__ = (
        UniqueConstraint('team_id', 'user_id', name='unique_team_member'),
    )
