"""
Task schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class TaskCreate(BaseModel):
    """Schema for creating a task"""
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    assigned_to: Optional[int] = None
    team_id: Optional[int] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = []
    estimate_hours: Optional[float] = None
    readiness_checklist: Optional[List[dict]] = Field(None, alias='readinessChecklist')
    size: Optional[str] = None

    class Config:
        populate_by_name = True


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    model_config = ConfigDict(extra='ignore', populate_by_name=True)

    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    team_id: Optional[int] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    estimate_hours: Optional[float] = None
    readiness_checklist: Optional[List[dict]] = Field(None, alias='readinessChecklist')
    size: Optional[str] = None


class TaskResponse(BaseModel):
    """Schema for task response"""
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigned_to: Optional[int]
    team_id: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    tags: Optional[List[str]]
    estimate_hours: Optional[float]
    readiness_checklist: Optional[List[dict]] = Field(None, alias='readinessChecklist')
    size: Optional[str]

    class Config:
        from_attributes = True
        populate_by_name = True
