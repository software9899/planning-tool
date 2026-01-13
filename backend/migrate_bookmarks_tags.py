"""
Migration Script: Convert bookmarks.tags from ARRAY to JSONB
Run this script on production database before deploying the new code
"""

import os
import sys
from sqlalchemy import create_engine, text

def migrate_bookmarks_tags():
    """Migrate bookmarks.tags from ARRAY(Text) to JSONB"""

    # Get database URL from environment or use default
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

    print(f"🔗 Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")

    try:
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("📊 Checking current table structure...")

                # Check if bookmarks table exists
                result = conn.execute(text("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'bookmarks' AND column_name = 'tags'
                """))

                row = result.fetchone()
                if not row:
                    print("⚠️  Warning: bookmarks.tags column not found. Skipping migration.")
                    return

                current_type = row[1]
                print(f"✅ Current tags column type: {current_type}")

                if current_type == 'jsonb':
                    print("✅ Column already migrated to JSONB. No action needed.")
                    return

                if current_type == 'ARRAY' or 'array' in current_type.lower():
                    print("🔄 Migrating ARRAY to JSONB...")

                    # Backup data first
                    print("💾 Creating backup of bookmarks table...")
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS bookmarks_backup_tags AS
                        SELECT * FROM bookmarks
                    """))
                    print("✅ Backup created: bookmarks_backup_tags")

                    # Convert ARRAY to JSONB
                    print("🔧 Converting tags column from ARRAY to JSONB...")
                    conn.execute(text("""
                        ALTER TABLE bookmarks
                        ALTER COLUMN tags TYPE JSONB
                        USING CASE
                            WHEN tags IS NULL THEN NULL
                            ELSE to_jsonb(tags)
                        END
                    """))

                    print("✅ Successfully converted tags column to JSONB")

                    # Verify migration
                    result = conn.execute(text("""
                        SELECT column_name, data_type
                        FROM information_schema.columns
                        WHERE table_name = 'bookmarks' AND column_name = 'tags'
                    """))

                    new_type = result.fetchone()[1]
                    print(f"✅ Verified new type: {new_type}")

                    # Commit transaction
                    trans.commit()
                    print("✅ Migration completed successfully!")

                else:
                    print(f"⚠️  Unexpected column type: {current_type}")
                    print("Please check the table structure manually.")

            except Exception as e:
                trans.rollback()
                print(f"❌ Error during migration: {str(e)}")
                print("🔄 Transaction rolled back. No changes made.")
                raise

    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Convert bookmarks.tags from ARRAY to JSONB")
    print("=" * 60)
    print()

    # Check if DATABASE_URL is set
    if not os.getenv("DATABASE_URL"):
        print("⚠️  WARNING: DATABASE_URL environment variable not set")
        print("Using default: postgresql://postgres:postgres123@localhost:5432/planning_tool")
        print()
        response = input("Continue with default database? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)

    migrate_bookmarks_tags()
    print()
    print("=" * 60)
    print("Migration complete! You can now deploy the new code.")
    print("=" * 60)
