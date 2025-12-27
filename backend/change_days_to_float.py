"""
Change days column from Integer to Float to support half-day leaves
"""
from sqlalchemy import create_engine, text
import os

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

engine = create_engine(DATABASE_URL)

def change_days_to_float():
    """Change days column type from integer to float"""
    with engine.connect() as connection:
        try:
            # Change column type to REAL (float)
            connection.execute(text("""
                ALTER TABLE leave_requests
                ALTER COLUMN days TYPE REAL;
            """))
            connection.commit()
            print("✅ Successfully changed days column to REAL (float)")
        except Exception as e:
            print(f"❌ Error changing days column type: {e}")
            raise

if __name__ == "__main__":
    print("Changing days column type to float...")
    change_days_to_float()
    print("Done!")
