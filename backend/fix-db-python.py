#!/usr/bin/env python3

"""
Fix bookmarks.tags: ARRAY → JSONB
ใช้ Python ไม่ต้องใช้ psql command
"""

import sys
import os

# ถาม credentials
print("=" * 50)
print("Fix Bookmarks Database")
print("=" * 50)
print()

db_host = input("Database Host [localhost]: ").strip() or "localhost"
db_port = input("Database Port [5432]: ").strip() or "5432"
db_name = input("Database Name [planning_tool]: ").strip() or "planning_tool"
db_user = input("Database User [postgres]: ").strip() or "postgres"
db_password = input("Database Password: ").strip()

print()
print("📦 Installing required packages...")

# Install psycopg2
os.system("pip3 install psycopg2-binary --quiet 2>/dev/null || pip install psycopg2-binary --quiet 2>/dev/null")

print()
print("🔄 Connecting to database...")

try:
    import psycopg2
    from psycopg2 import sql

    # Connect
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password
    )

    print("✅ Connected successfully!")
    print()

    cursor = conn.cursor()

    # Check current column type
    print("🔍 Checking current column type...")
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'tags'
    """)

    result = cursor.fetchone()
    if not result:
        print("❌ Column 'tags' not found in bookmarks table")
        sys.exit(1)

    current_type = result[1]
    print(f"   Current type: {current_type}")
    print()

    if current_type == 'jsonb':
        print("✅ Column is already JSONB. No migration needed!")
        conn.close()
        sys.exit(0)

    # Backup
    print("💾 Creating backup table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookmarks_backup_tags AS
        SELECT * FROM bookmarks
    """)
    conn.commit()
    print("✅ Backup created: bookmarks_backup_tags")
    print()

    # Migrate
    print("🔄 Converting ARRAY to JSONB...")
    cursor.execute("""
        ALTER TABLE bookmarks
        ALTER COLUMN tags TYPE JSONB
        USING CASE
            WHEN tags IS NULL THEN NULL
            ELSE to_jsonb(tags)
        END
    """)
    conn.commit()
    print("✅ Migration completed!")
    print()

    # Verify
    print("🔍 Verifying migration...")
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'tags'
    """)

    result = cursor.fetchone()
    new_type = result[1]
    print(f"   New type: {new_type}")
    print()

    if new_type == 'jsonb':
        print("=" * 50)
        print("✅ SUCCESS! Database fixed!")
        print("=" * 50)
        print()
        print("Next steps:")
        print("1. Restart backend service")
        print("2. Test: curl http://68.183.227.173:8002/api/bookmarks")
        print()
    else:
        print("⚠️  Migration completed but type is: " + new_type)

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    print()
    print("Possible issues:")
    print("- Wrong credentials")
    print("- Database not accessible")
    print("- PostgreSQL not running")
    print()
    print("Try running: ./check-database.sh")
    sys.exit(1)
