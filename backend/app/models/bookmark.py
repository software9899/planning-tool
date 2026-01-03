"""
Bookmark model
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ARRAY, ForeignKey
from app.utils.database import Base


class Bookmark(Base):
    """Bookmark model"""
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(Text, nullable=False)
    favicon = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(ARRAY(Text), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
