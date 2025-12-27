#!/usr/bin/env python3
"""Migration script to add status column to users table"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

def add_status_column():
    """Add status column to users table if it doesn't exist"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='users' AND column_name='status'
        """)

        if cursor.fetchone():
            print("✅ Status column already exists")
        else:
            # Add column with default value
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN status VARCHAR(50) DEFAULT 'active'
            """)

            # Update existing records to have 'active' status
            cursor.execute("""
                UPDATE users
                SET status = 'active'
                WHERE status IS NULL
            """)

            conn.commit()
            print("✅ Successfully added status column to users table")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error adding status column: {e}")
        raise

if __name__ == "__main__":
    add_status_column()
