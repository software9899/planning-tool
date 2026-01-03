"""
Pydantic schemas
"""
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.schemas.user import UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkResponse

__all__ = [
    'TaskCreate',
    'TaskUpdate',
    'TaskResponse',
    'UserResponse',
    'ForgotPasswordRequest',
    'ResetPasswordRequest',
    'BookmarkCreate',
    'BookmarkUpdate',
    'BookmarkResponse',
]
