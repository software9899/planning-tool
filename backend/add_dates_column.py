"""
Add dates column to leave_requests table and remove excluded_dates
"""
from sqlalchemy import create_engine, text
import os

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

engine = create_engine(DATABASE_URL)

def add_dates_column():
    """Add dates column and remove excluded_dates"""
    with engine.connect() as connection:
        try:
            # Drop excluded_dates column if exists
            connection.execute(text("""
                ALTER TABLE leave_requests
                DROP COLUMN IF EXISTS excluded_dates;
            """))
            print("✅ Dropped excluded_dates column")

            # Add dates column as an array of strings
            connection.execute(text("""
                ALTER TABLE leave_requests
                ADD COLUMN IF NOT EXISTS dates TEXT[];
            """))
            print("✅ Added dates column to leave_requests table")

            connection.commit()

        except Exception as e:
            print(f"❌ Error adding dates column: {e}")
            raise

if __name__ == "__main__":
    print("Adding dates column to leave_requests table...")
    add_dates_column()
    print("Done!")
