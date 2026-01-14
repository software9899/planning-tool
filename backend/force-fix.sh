#!/bin/bash

# Force fix bookmarks.tags: ARRAY → JSONB in Docker

set -e

echo "=========================================="
echo "Force Fix Database Schema"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

POSTGRES_CONTAINER="planning-tool-db"
BACKEND_CONTAINER="planning-tool-backend"

echo -e "${BLUE}🔄 Step 1: Backup bookmarks table${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool <<EOF
DROP TABLE IF EXISTS bookmarks_backup_original;
CREATE TABLE bookmarks_backup_original AS SELECT * FROM bookmarks;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}🔄 Step 2: Convert ARRAY to JSONB${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool <<EOF
-- Convert tags column
ALTER TABLE bookmarks
ALTER COLUMN tags TYPE JSONB
USING CASE
    WHEN tags IS NULL THEN NULL::jsonb
    WHEN tags::text = '{}' THEN '[]'::jsonb
    ELSE to_jsonb(tags)
END;

-- Set default
ALTER TABLE bookmarks
ALTER COLUMN tags SET DEFAULT '[]'::jsonb;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookmarks' AND column_name = 'tags';
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Column converted to JSONB${NC}"
else
    echo -e "${RED}❌ Conversion failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}🔄 Step 3: Verify schema${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool -c "
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'bookmarks' AND column_name = 'tags';
"

echo ""

echo -e "${BLUE}🔄 Step 4: Restart backend${NC}"
docker restart $BACKEND_CONTAINER

echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

echo -e "${BLUE}⏳ Waiting for backend to start...${NC}"
sleep 5

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Fix Complete!${NC}"
echo "=========================================="
echo ""

echo "Testing API..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/api/bookmarks)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API is working! (Status: $RESPONSE)${NC}"
else
    echo -e "${RED}❌ API still failing (Status: $RESPONSE)${NC}"
    echo ""
    echo "Check logs:"
    echo "  docker logs --tail=50 $BACKEND_CONTAINER"
fi

echo ""
echo "Test bookmark creation:"
echo '  curl -X POST http://localhost:8002/api/bookmarks \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"title": "Test", "url": "https://example.com", "tags": ["test"]}'"'"
echo "=========================================="
