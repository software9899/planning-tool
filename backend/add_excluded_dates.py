"""
Add excluded_dates column to leave_requests table
"""
from sqlalchemy import create_engine, Column, ARRAY, String, text
import os

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

engine = create_engine(DATABASE_URL)

def add_excluded_dates_column():
    """Add excluded_dates column to leave_requests table"""
    with engine.connect() as connection:
        try:
            # Add excluded_dates column as an array of strings (dates in ISO format)
            connection.execute(text("""
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS excluded_dates TEXT[];
            """))
            connection.commit()
            print("✅ Successfully added excluded_dates column to leave_requests table")
        except Exception as e:
            print(f"❌ Error adding excluded_dates column: {e}")
            raise

if __name__ == "__main__":
    print("Adding excluded_dates column to leave_requests table...")
    add_excluded_dates_column()
    print("Done!")
