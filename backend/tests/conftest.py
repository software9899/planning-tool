"""
Pytest configuration and fixtures
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

# Uncomment when main.py is refactored
# from app.main import app
# from app.utils.database import Base, get_db

# Test database URL
TEST_DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/planning_tool_test"


@pytest.fixture(scope="session")
def test_engine():
    """
    Create test database engine
    This engine is created once per test session
    """
    engine = create_engine(TEST_DATABASE_URL)

    # Uncomment when refactoring is complete:
    # Base.metadata.create_all(bind=engine)

    yield engine

    # Cleanup after all tests
    # Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def test_db(test_engine) -> Generator[Session, None, None]:
    """
    Create test database session
    This session is created for each test function
    """
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestSessionLocal()

    try:
        yield db
    finally:
        db.rollback()  # Rollback any changes
        db.close()


@pytest.fixture(scope="function")
def client(test_db):
    """
    Create FastAPI test client
    Override the database dependency to use test database
    """
    # Uncomment when main.py is refactored:
    # def override_get_db():
    #     try:
    #         yield test_db
    #     finally:
    #         pass
    #
    # app.dependency_overrides[get_db] = override_get_db
    # with TestClient(app) as test_client:
    #     yield test_client
    # app.dependency_overrides.clear()

    pass  # Remove this when uncommenting above


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123",
        "role": "member"
    }


@pytest.fixture
def sample_task_data():
    """Sample task data for testing"""
    return {
        "title": "Test Task",
        "description": "Test Description",
        "status": "todo",
        "priority": "medium"
    }


@pytest.fixture
def sample_bookmark_data():
    """Sample bookmark data for testing"""
    return {
        "title": "Test Bookmark",
        "url": "https://example.com",
        "description": "Test description",
        "tags": ["test"]
    }


# Helper functions for tests

def create_test_user(db: Session, user_data: dict):
    """Helper to create a test user"""
    # Uncomment when models are imported:
    # from app.models import User
    # user = User(**user_data)
    # db.add(user)
    # db.commit()
    # db.refresh(user)
    # return user
    pass


def create_test_task(db: Session, task_data: dict):
    """Helper to create a test task"""
    # Uncomment when models are imported:
    # from app.models import Task
    # task = Task(**task_data)
    # db.add(task)
    # db.commit()
    # db.refresh(task)
    # return task
    pass


def create_test_bookmark(db: Session, bookmark_data: dict):
    """Helper to create a test bookmark"""
    # Uncomment when models are imported:
    # from app.models import Bookmark
    # bookmark = Bookmark(**bookmark_data)
    # db.add(bookmark)
    # db.commit()
    # db.refresh(bookmark)
    # return bookmark
    pass
