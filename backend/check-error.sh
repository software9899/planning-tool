#!/bin/bash

# Check backend error logs

echo "=========================================="
echo "Checking Backend Errors"
echo "=========================================="
echo ""

# Find backend container
BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "backend|planning-tool-backend" | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "❌ Backend container not found"
    docker ps
    exit 1
fi

echo "✅ Backend container: $BACKEND_CONTAINER"
echo ""

echo "=========================================="
echo "Last 50 lines of backend logs:"
echo "=========================================="
docker logs --tail=50 $BACKEND_CONTAINER

echo ""
echo "=========================================="
echo "Testing API endpoint:"
echo "=========================================="
curl -v http://localhost:8002/api/bookmarks

echo ""
echo ""
echo "=========================================="
echo "Checking database connection:"
echo "=========================================="
docker exec $BACKEND_CONTAINER python -c "
import os
from sqlalchemy import create_engine, text
db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres123@localhost:5432/planning_tool')
print(f'Testing connection to: {db_url}')
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT version()'))
        print('✅ Database connected!')
        print(result.fetchone()[0])

        # Check bookmarks table
        result = conn.execute(text(\"\"\"
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'bookmarks' AND column_name = 'tags'
        \"\"\"))
        row = result.fetchone()
        if row:
            print(f'✅ bookmarks.tags type: {row[1]}')
        else:
            print('❌ bookmarks.tags column not found')
except Exception as e:
    print(f'❌ Error: {e}')
" 2>&1

echo ""
echo "=========================================="
