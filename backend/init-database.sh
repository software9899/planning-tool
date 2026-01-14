#!/bin/bash

# Initialize fresh database with correct schema

set -e

echo "=========================================="
echo "Initialize Fresh Database"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Warning
echo -e "${RED}⚠️  WARNING ⚠️${NC}"
echo "This will DROP the existing database and create a new one!"
echo "All data will be LOST!"
echo ""
read -p "Are you ABSOLUTELY sure? Type 'YES' to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# Find PostgreSQL container
echo -e "${BLUE}🔍 Finding PostgreSQL container...${NC}"
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "postgres|planning-tool-db|db" | grep -v mongodb | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}❌ PostgreSQL container not found${NC}"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Image}}"
    echo ""
    echo "Please specify container name manually:"
    read -p "PostgreSQL container name: " POSTGRES_CONTAINER

    if [ -z "$POSTGRES_CONTAINER" ]; then
        echo "Cancelled."
        exit 1
    fi
fi

echo -e "${GREEN}✅ Found: $POSTGRES_CONTAINER${NC}"
echo ""

# Drop and recreate database
echo -e "${BLUE}🗑️  Dropping old database...${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres <<EOF
DROP DATABASE IF EXISTS planning_tool;
CREATE DATABASE planning_tool;
GRANT ALL PRIVILEGES ON DATABASE planning_tool TO postgres;
EOF

echo -e "${GREEN}✅ Fresh database created${NC}"
echo ""

# Run initialization
echo -e "${BLUE}📋 Creating tables with correct schema...${NC}"

# Copy and run init SQL
cat > /tmp/init-db.sql <<'EOSQL'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks table (with JSONB tags!)
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    favicon TEXT,
    description TEXT,
    category VARCHAR(255) DEFAULT 'Uncategorized',
    tags JSONB DEFAULT '[]'::jsonb,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(255) DEFAULT 'General',
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection bookmarks (junction table)
CREATE TABLE IF NOT EXISTS collection_bookmarks (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    bookmark_id INTEGER REFERENCES bookmarks(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, bookmark_id)
);

-- Collection members
CREATE TABLE IF NOT EXISTS collection_members (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, username)
);

-- Diagrams table
CREATE TABLE IF NOT EXISTS diagrams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    diagram_data TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Draft headcount table
CREATE TABLE IF NOT EXISTS draft_headcount (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    position VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days FLOAT NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    excluded_dates JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave balance table
CREATE TABLE IF NOT EXISTS leave_balance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    annual_total INTEGER DEFAULT 15,
    annual_used INTEGER DEFAULT 0,
    sick_total INTEGER DEFAULT 10,
    sick_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Success message
SELECT 'Database initialized successfully!' as status;
EOSQL

docker cp /tmp/init-db.sql $POSTGRES_CONTAINER:/tmp/
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool -f /tmp/init-db.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tables created with correct schema${NC}"
else
    echo -e "${RED}❌ Failed to create tables${NC}"
    exit 1
fi

# Clean up
rm /tmp/init-db.sql
docker exec $POSTGRES_CONTAINER rm /tmp/init-db.sql

echo ""

# Restart backend
echo -e "${BLUE}🔄 Restarting backend...${NC}"
BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "backend|planning" | grep -v postgres | head -1)

if [ -n "$BACKEND_CONTAINER" ]; then
    docker restart $BACKEND_CONTAINER
    echo -e "${GREEN}✅ Backend restarted${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Database Initialized!${NC}"
echo "=========================================="
echo ""
echo "Fresh database with correct schema:"
echo "  ✅ bookmarks.tags = JSONB (not ARRAY)"
echo "  ✅ All tables created"
echo "  ✅ Indexes created"
echo ""
echo "Test the API:"
echo "  curl http://68.183.227.173:8002/api/bookmarks"
echo ""
echo "Create a test bookmark:"
echo '  curl -X POST http://68.183.227.173:8002/api/bookmarks \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"title": "Test", "url": "https://example.com", "tags": ["test"]}'"'"
echo "=========================================="
