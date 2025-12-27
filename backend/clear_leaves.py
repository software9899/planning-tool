"""
Clear all leave requests and reset leave balances
"""
from sqlalchemy import create_engine, text
import os

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

engine = create_engine(DATABASE_URL)

def clear_all_leaves():
    """Delete all leave requests and reset leave balances"""
    with engine.connect() as connection:
        try:
            # Delete all leave requests
            result = connection.execute(text("DELETE FROM leave_requests;"))
            connection.commit()
            print(f"✅ Deleted all leave requests")

            # Reset leave balances (set used to 0)
            result = connection.execute(text("""
                UPDATE leave_balances
                SET annual_used = 0, sick_used = 0;
            """))
            connection.commit()
            print(f"✅ Reset all leave balances to 0")

        except Exception as e:
            print(f"❌ Error clearing leaves: {e}")
            raise

if __name__ == "__main__":
    print("Clearing all leave data from database...")
    clear_all_leaves()
    print("Done!")
