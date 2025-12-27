#!/usr/bin/env python3
"""Migration script to create draft_headcount table"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

def create_draft_headcount_table():
    """Create draft_headcount table for storing vacancy positions"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Create draft_headcount table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS draft_headcount (
                id SERIAL PRIMARY KEY,
                position_title VARCHAR(255) NOT NULL,
                department VARCHAR(255),
                line_manager INTEGER REFERENCES users(id),
                required_skills TEXT,
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        print("✅ Successfully created draft_headcount table")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error creating draft_headcount table: {e}")
        raise

if __name__ == "__main__":
    create_draft_headcount_table()
