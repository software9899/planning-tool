"""
Bookmark schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BookmarkCreate(BaseModel):
    """Schema for creating a bookmark"""
    title: str
    url: str
    favicon: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = 'Uncategorized'
    tags: Optional[List[str]] = []


class BookmarkUpdate(BaseModel):
    """Schema for updating a bookmark"""
    title: Optional[str] = None
    url: Optional[str] = None
    favicon: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class BookmarkResponse(BaseModel):
    """Schema for bookmark response"""
    id: int
    title: str
    url: str
    favicon: Optional[str]
    description: Optional[str]
    category: Optional[str]
    tags: Optional[List[str]]
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
