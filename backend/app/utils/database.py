"""
Database configuration and utilities
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres123@localhost:5432/planning_tool"
)

# Create engine
engine = create_engine(DATABASE_URL)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


# Dependency to get DB session
def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize database
def init_db():
    """
    Initialize database tables
    """
    Base.metadata.create_all(bind=engine)
