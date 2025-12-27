"""
Seed Data Script for Planning Tool
Run this script to populate the database with initial test data
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import User, Task, Base
from auth import get_password_hash
import os
from datetime import datetime, timedelta

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all tables if they don't exist"""
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")

def seed_users(db):
    """Seed initial users"""
    print("\nSeeding users...")

    # Check if users already exist
    existing_users = db.query(User).count()
    if existing_users > 0:
        print(f"⚠️  {existing_users} users already exist. Skipping user seeding.")
        return

    users = [
        {
            "name": "Admin User",
            "email": "admin@example.com",
            "password": "admin123",
            "role": "admin",
            "position": "System Administrator"
        },
        {
            "name": "Toffee2",
            "email": "toffee2@example.com",
            "password": "password123",
            "role": "developer",
            "position": "Senior Developer"
        },
        {
            "name": "Natchapon Wanichkamonnan",
            "email": "natchapon@example.com",
            "password": "password123",
            "role": "developer",
            "position": "Developer",
            "line_manager": 2  # Reports to Toffee2
        },
        {
            "name": "Test User 1",
            "email": "test1@example.com",
            "password": "password123",
            "role": "qa",
            "position": "QA Engineer"
        },
        {
            "name": "Test User 2",
            "email": "test2@example.com",
            "password": "password123",
            "role": "designer",
            "position": "UI/UX Designer"
        }
    ]

    for user_data in users:
        password = user_data.pop("password")
        user = User(
            **user_data,
            password_hash=get_password_hash(password)
        )
        db.add(user)

    db.commit()
    print(f"✅ Created {len(users)} users")
    print("   - admin@example.com / admin123 (Admin)")
    print("   - toffee2@example.com / password123 (Developer)")
    print("   - natchapon@example.com / password123 (Developer)")
    print("   - test1@example.com / password123 (QA)")
    print("   - test2@example.com / password123 (Designer)")

def seed_tasks(db):
    """Seed initial tasks"""
    print("\nSeeding tasks...")

    # Check if tasks already exist
    existing_tasks = db.query(Task).count()
    if existing_tasks > 0:
        print(f"⚠️  {existing_tasks} tasks already exist. Skipping task seeding.")
        return

    tasks = [
        {
            "title": "Setup Development Environment",
            "description": "Install dependencies and configure development tools",
            "status": "done",
            "priority": "high",
            "assigned_to": 2,
            "tags": ["setup", "dev"]
        },
        {
            "title": "Implement User Authentication",
            "description": "Add login and registration functionality",
            "status": "in_progress",
            "priority": "high",
            "assigned_to": 2,
            "due_date": datetime.now() + timedelta(days=3),
            "estimate_hours": 8,
            "tags": ["auth", "backend"]
        },
        {
            "title": "Design Dashboard UI",
            "description": "Create mockups for the main dashboard",
            "status": "todo",
            "priority": "medium",
            "assigned_to": 5,
            "due_date": datetime.now() + timedelta(days=7),
            "estimate_hours": 16,
            "tags": ["design", "ui"]
        },
        {
            "title": "Write API Documentation",
            "description": "Document all API endpoints",
            "status": "todo",
            "priority": "medium",
            "assigned_to": 3,
            "tags": ["documentation", "api"]
        },
        {
            "title": "Setup Testing Framework",
            "description": "Configure pytest and write initial tests",
            "status": "in_progress",
            "priority": "high",
            "assigned_to": 4,
            "estimate_hours": 12,
            "tags": ["testing", "qa"]
        }
    ]

    for task_data in tasks:
        task = Task(**task_data)
        db.add(task)

    db.commit()
    print(f"✅ Created {len(tasks)} tasks")

def main():
    """Main seeding function"""
    print("="*50)
    print("🌱 Planning Tool - Database Seeding")
    print("="*50)

    # Create tables
    create_tables()

    # Create session
    db = SessionLocal()

    try:
        # Seed data
        seed_users(db)
        seed_tasks(db)

        print("\n" + "="*50)
        print("✅ Seeding completed successfully!")
        print("="*50)
        print("\n📝 Next steps:")
        print("1. Start the backend: python main.py")
        print("2. Login with: admin@example.com / admin123")
        print("3. Or use: toffee2@example.com / password123")

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
