"""
Initialize database tables
Run this script to create all tables defined in main.py
"""

from main import Base, engine, SessionLocal, Setting
import json

def create_tables():
    """Create all tables in the database"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully!")

def seed_initial_settings():
    """Seed initial settings data"""
    db = SessionLocal()
    try:
        # Check if settings already exist
        existing = db.query(Setting).first()
        if existing:
            print("Settings already exist, skipping seed data")
            return

        print("Seeding initial settings...")

        # Default task types
        task_types = ["Feature", "Bug Fix", "Enhancement", "Documentation"]
        db.add(Setting(
            key="taskTypes",
            value=json.dumps(task_types),
            description="Available task types for categorization"
        ))

        # Default priorities
        priorities = ["Low", "Medium", "High"]
        db.add(Setting(
            key="priorities",
            value=json.dumps(priorities),
            description="Task priority levels"
        ))

        # Default statuses
        statuses = ["to-do", "in-progress", "done"]
        db.add(Setting(
            key="statuses",
            value=json.dumps(statuses),
            description="Task status options for Kanban board"
        ))

        # Default tags
        tags = ["Bug", "Feature", "Enhancement"]
        db.add(Setting(
            key="tags",
            value=json.dumps(tags),
            description="Available task tags"
        ))

        # Default checklist templates (empty object)
        db.add(Setting(
            key="checklistTemplates",
            value="{}",
            description="Readiness checklist templates for each task type"
        ))

        db.commit()
        print("✓ Initial settings seeded successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Database Initialization ===")
    create_tables()
    seed_initial_settings()
    print("=== Initialization Complete ===")
