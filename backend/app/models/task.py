"""
Task model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ARRAY, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from app.utils.database import Base


class Task(Base):
    """Task model for project management"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="todo")
    priority = Column(String(50), default="medium")
    assigned_to = Column(Integer)
    team_id = Column(Integer)
    due_date = Column(DateTime)
    created_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tags = Column(ARRAY(Text))
    estimate_hours = Column(Numeric(10, 2))
    readiness_checklist = Column(JSONB)
    size = Column(String(10))
