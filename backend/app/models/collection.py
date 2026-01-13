"""
Collection models for shared bookmark collections
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.utils.database import Base


class Collection(Base):
    """Collection model for organizing bookmarks"""
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CollectionMember(Base):
    """Collection member model for tracking who has access to collections"""
    __tablename__ = "collection_members"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="member")  # owner, editor, member
    created_at = Column(DateTime, default=datetime.utcnow)

    # Ensure a user can only be added once to a collection
    __table_args__ = (
        UniqueConstraint('collection_id', 'user_id', name='unique_collection_member'),
    )
