"""
Tests for database models
"""
import pytest
from datetime import datetime
from app.models import User, Task, Bookmark, Team


def test_user_model_creation():
    """Test User model creation"""
    user = User(
        name="Test User",
        email="test@example.com",
        password_hash="hashed_password",
        role="member"
    )
    assert user.name == "Test User"
    assert user.email == "test@example.com"
    assert user.role == "member"
    assert user.status == "active"  # default value


def test_task_model_creation():
    """Test Task model creation"""
    task = Task(
        title="Test Task",
        description="Test Description",
        status="todo",
        priority="high"
    )
    assert task.title == "Test Task"
    assert task.description == "Test Description"
    assert task.status == "todo"
    assert task.priority == "high"


def test_task_model_defaults():
    """Test Task model default values"""
    task = Task(title="Test Task")
    assert task.status == "todo"
    assert task.priority == "medium"


def test_bookmark_model_creation():
    """Test Bookmark model creation"""
    bookmark = Bookmark(
        title="Test Bookmark",
        url="https://example.com",
        description="Test description"
    )
    assert bookmark.title == "Test Bookmark"
    assert bookmark.url == "https://example.com"
    assert bookmark.description == "Test description"


def test_team_model_creation():
    """Test Team model creation"""
    team = Team(
        name="Engineering",
        description="Engineering team",
        icon="⚙️"
    )
    assert team.name == "Engineering"
    assert team.description == "Engineering team"
    assert team.icon == "⚙️"
