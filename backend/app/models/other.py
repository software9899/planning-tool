"""
Other models (Settings, Diagram, Headcount, Leave)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, ARRAY, Float
from app.utils.database import Base


class Setting(Base):
    """Application settings model"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Diagram(Base):
    """Diagram model for visual diagrams"""
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    diagram_data = Column(Text, nullable=False)  # JSON string containing shapes, connections, etc.
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DraftHeadcount(Base):
    """Draft headcount/position model"""
    __tablename__ = "draft_headcount"

    id = Column(Integer, primary_key=True, index=True)
    position_title = Column(String(255), nullable=False)
    department = Column(String(255))
    line_manager = Column(Integer, ForeignKey("users.id"))
    required_skills = Column(Text)
    description = Column(Text)
    status = Column(String(50), default="open")
    recruiting_status = Column(String(50), default="open")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeaveRequest(Base):
    """Leave request model"""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String(255), nullable=False)
    leave_type = Column(String(50), nullable=False)  # annual, sick, personal, unpaid
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    days = Column(Float, nullable=False)
    half_day_type = Column(String(20), nullable=True)  # null/full_day, morning, afternoon
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    requested_date = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(String(255), nullable=True)
    reviewed_date = Column(DateTime, nullable=True)
    dates = Column(ARRAY(Text), nullable=True)  # Array of all leave dates (ISO format strings)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeaveBalance(Base):
    """Leave balance model"""
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_name = Column(String(255), nullable=False)
    annual_total = Column(Integer, default=15)
    annual_used = Column(Integer, default=0)
    sick_total = Column(Integer, default=10)
    sick_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
