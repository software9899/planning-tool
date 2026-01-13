"""
Collection schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CollectionCreate(BaseModel):
    """Schema for creating a collection"""
    name: str


class CollectionResponse(BaseModel):
    """Schema for collection response"""
    id: int
    name: str
    owner_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CollectionMemberAdd(BaseModel):
    """Schema for adding a member to a collection"""
    username: str
    role: Optional[str] = "member"  # owner, editor, member


class CollectionMemberResponse(BaseModel):
    """Schema for collection member response"""
    id: int
    collection_id: int
    user_id: int
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionWithMembers(BaseModel):
    """Schema for collection with its members"""
    id: int
    name: str
    owner_id: Optional[int]
    members: List[CollectionMemberResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
