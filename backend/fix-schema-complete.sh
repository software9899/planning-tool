#!/bin/bash

# Fix complete bookmarks schema

set -e

echo "=========================================="
echo "Fix Complete Bookmarks Schema"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

POSTGRES_CONTAINER="planning-tool-db"
BACKEND_CONTAINER="planning-tool-backend"

echo -e "${BLUE}🔍 Step 1: Check current schema${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookmarks'
ORDER BY ordinal_position;
"

echo ""
echo -e "${BLUE}🔄 Step 2: Add missing columns${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool <<'EOF'
-- Add category column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'category'
    ) THEN
        ALTER TABLE bookmarks ADD COLUMN category VARCHAR(255) DEFAULT 'Uncategorized';
        RAISE NOTICE 'Added category column';
    ELSE
        RAISE NOTICE 'category column already exists';
    END IF;
END $$;

-- Add description column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'description'
    ) THEN
        ALTER TABLE bookmarks ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    ELSE
        RAISE NOTICE 'description column already exists';
    END IF;
END $$;

-- Add favicon column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'favicon'
    ) THEN
        ALTER TABLE bookmarks ADD COLUMN favicon TEXT;
        RAISE NOTICE 'Added favicon column';
    ELSE
        RAISE NOTICE 'favicon column already exists';
    END IF;
END $$;

-- Fix tags column type
DO $$
BEGIN
    -- Check if tags is ARRAY
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks'
        AND column_name = 'tags'
        AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE bookmarks
        ALTER COLUMN tags TYPE JSONB
        USING CASE
            WHEN tags IS NULL THEN NULL::jsonb
            WHEN tags::text = '{}' THEN '[]'::jsonb
            ELSE to_jsonb(tags)
        END;

        ALTER TABLE bookmarks
        ALTER COLUMN tags SET DEFAULT '[]'::jsonb;

        RAISE NOTICE 'Converted tags to JSONB';
    ELSE
        RAISE NOTICE 'tags is already JSONB or does not exist';
    END IF;
END $$;

-- Add user_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE bookmarks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column';
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- Add timestamps if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE bookmarks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookmarks' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE bookmarks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema updated${NC}"
else
    echo -e "${RED}❌ Schema update failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Step 3: Verify final schema${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool -c "
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookmarks'
ORDER BY ordinal_position;
"

echo ""
echo -e "${BLUE}🔄 Step 4: Restart backend${NC}"
docker restart $BACKEND_CONTAINER
sleep 5
echo -e "${GREEN}✅ Backend restarted${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Schema Fixed!${NC}"
echo "=========================================="
echo ""

echo "Testing API..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/api/bookmarks)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API is working! (Status: $RESPONSE)${NC}"
    echo ""
    echo "Get bookmarks:"
    curl -s http://localhost:8002/api/bookmarks | head -c 200
    echo "..."
else
    echo -e "${RED}❌ API still failing (Status: $RESPONSE)${NC}"
    echo ""
    echo "Check logs:"
    echo "  docker logs --tail=20 $BACKEND_CONTAINER"
fi

echo ""
echo ""
echo "Test bookmark creation:"
echo '  curl -X POST http://localhost:8002/api/bookmarks \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"title": "Test", "url": "https://example.com", "category": "Test", "tags": ["test"]}'"'"
echo "=========================================="
