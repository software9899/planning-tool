"""
Tests for Pydantic schemas
"""
import pytest
from pydantic import ValidationError
from app.schemas import (
    BookmarkCreate,
    BookmarkUpdate,
    BookmarkResponse,
    TaskCreate,
    TaskUpdate,
)


class TestBookmarkSchemas:
    """Tests for Bookmark schemas"""

    def test_bookmark_create_valid(self):
        """Test valid bookmark creation"""
        bookmark = BookmarkCreate(
            title="Test Bookmark",
            url="https://example.com",
            description="Test description"
        )
        assert bookmark.title == "Test Bookmark"
        assert bookmark.url == "https://example.com"
        assert bookmark.description == "Test description"

    def test_bookmark_create_minimal(self):
        """Test bookmark with minimal required fields"""
        bookmark = BookmarkCreate(
            title="Test",
            url="https://example.com"
        )
        assert bookmark.title == "Test"
        assert bookmark.url == "https://example.com"
        assert bookmark.description is None
        assert bookmark.tags == []

    def test_bookmark_create_missing_required(self):
        """Test bookmark creation with missing required fields"""
        with pytest.raises(ValidationError) as exc_info:
            BookmarkCreate(title="Test")
        assert "url" in str(exc_info.value)

    def test_bookmark_update(self):
        """Test bookmark update schema"""
        update = BookmarkUpdate(title="Updated Title")
        assert update.title == "Updated Title"
        assert update.url is None  # not updated

    def test_bookmark_response_from_dict(self):
        """Test creating BookmarkResponse from dict"""
        data = {
            "id": 1,
            "title": "Test",
            "url": "https://example.com",
            "favicon": None,
            "description": None,
            "tags": [],
            "user_id": None,
            "created_at": "2025-01-03T10:00:00",
            "updated_at": "2025-01-03T10:00:00"
        }
        bookmark = BookmarkResponse(**data)
        assert bookmark.id == 1
        assert bookmark.title == "Test"


class TestTaskSchemas:
    """Tests for Task schemas"""

    def test_task_create_valid(self):
        """Test valid task creation"""
        task = TaskCreate(
            title="Test Task",
            description="Test Description",
            priority="high"
        )
        assert task.title == "Test Task"
        assert task.description == "Test Description"
        assert task.priority == "high"
        assert task.status == "todo"  # default

    def test_task_create_minimal(self):
        """Test task with minimal required fields"""
        task = TaskCreate(title="Test Task")
        assert task.title == "Test Task"
        assert task.status == "todo"
        assert task.priority == "medium"

    def test_task_create_missing_title(self):
        """Test task creation without title"""
        with pytest.raises(ValidationError) as exc_info:
            TaskCreate(description="No title")
        assert "title" in str(exc_info.value)

    def test_task_update_partial(self):
        """Test partial task update"""
        update = TaskUpdate(status="in_progress")
        assert update.status == "in_progress"
        assert update.title is None  # not updated

    def test_task_with_tags(self):
        """Test task with tags"""
        task = TaskCreate(
            title="Test Task",
            tags=["urgent", "bug"]
        )
        assert task.tags == ["urgent", "bug"]
