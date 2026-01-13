"""
Migration script to add collections support to bookmarks
- Adds category column to bookmarks table
- Creates collections table
- Creates collection_members table
"""
import sys
from sqlalchemy import create_engine, text, inspect
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

def run_migration():
    """Run database migrations"""
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)

    with engine.connect() as conn:
        print("🔧 Starting database migration...")

        # Check if bookmarks table exists
        if 'bookmarks' in inspector.get_table_names():
            # Check if category column already exists
            columns = [col['name'] for col in inspector.get_columns('bookmarks')]

            if 'category' not in columns:
                print("📝 Adding category column to bookmarks table...")
                conn.execute(text("""
                    ALTER TABLE bookmarks
                    ADD COLUMN category VARCHAR(255) DEFAULT 'Uncategorized'
                """))
                conn.commit()
                print("✅ Category column added successfully")
            else:
                print("ℹ️  Category column already exists")
        else:
            print("⚠️  Bookmarks table does not exist yet")

        # Check if collections table exists
        if 'collections' not in inspector.get_table_names():
            print("📝 Creating collections table...")
            conn.execute(text("""
                CREATE TABLE collections (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("✅ Collections table created successfully")
        else:
            print("ℹ️  Collections table already exists")

        # Check if collection_members table exists
        if 'collection_members' not in inspector.get_table_names():
            print("📝 Creating collection_members table...")
            conn.execute(text("""
                CREATE TABLE collection_members (
                    id SERIAL PRIMARY KEY,
                    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role VARCHAR(50) DEFAULT 'member',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT unique_collection_member UNIQUE (collection_id, user_id)
                )
            """))
            conn.commit()
            print("✅ Collection_members table created successfully")
        else:
            print("ℹ️  Collection_members table already exists")

        # Create indexes for better performance
        print("📝 Creating indexes...")
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_collection_members_collection_id ON collection_members(collection_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_collection_members_user_id ON collection_members(user_id)"))
            conn.commit()
            print("✅ Indexes created successfully")
        except Exception as e:
            print(f"⚠️  Some indexes may already exist: {e}")

        print("🎉 Migration completed successfully!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
