"""
Migration script to add category column to collections table
"""
import sys
from sqlalchemy import create_engine, text, inspect
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

def run_migration():
    """Run database migration"""
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)

    with engine.connect() as conn:
        print("🔧 Starting migration: Add category to collections...")

        # Check if collections table exists
        if 'collections' in inspector.get_table_names():
            # Check if category column already exists
            columns = [col['name'] for col in inspector.get_columns('collections')]

            if 'category' not in columns:
                print("📝 Adding category column to collections table...")
                conn.execute(text("""
                    ALTER TABLE collections
                    ADD COLUMN category VARCHAR(255) DEFAULT 'General'
                """))
                conn.commit()
                print("✅ Category column added successfully")
            else:
                print("ℹ️  Category column already exists")
        else:
            print("⚠️  Collections table does not exist yet")

        # Create index for better performance
        print("📝 Creating index...")
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_collections_category ON collections(category)"))
            conn.commit()
            print("✅ Index created successfully")
        except Exception as e:
            print(f"⚠️  Index may already exist: {e}")

        print("🎉 Migration completed successfully!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
