#!/bin/bash

# ตรวจสอบว่า PostgreSQL รันอยู่ที่ไหน

echo "=========================================="
echo "Checking PostgreSQL Location"
echo "=========================================="
echo ""

# 1. Check if psql is installed
echo "1. Checking psql installation:"
if command -v psql &> /dev/null; then
    echo "   ✅ psql installed: $(psql --version)"
else
    echo "   ❌ psql not installed"
    echo "   Install with: sudo apt-get install postgresql-client"
fi
echo ""

# 2. Check if PostgreSQL server is running locally
echo "2. Checking PostgreSQL server:"
if systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL service is running"
    systemctl status postgresql --no-pager -l
elif pgrep -x postgres > /dev/null; then
    echo "   ✅ PostgreSQL process found"
    ps aux | grep postgres | grep -v grep
else
    echo "   ❌ PostgreSQL not running locally"
fi
echo ""

# 3. Check Docker containers
echo "3. Checking Docker containers:"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -E "postgres|planning"

    if [ $? -eq 0 ]; then
        echo ""
        echo "   Found PostgreSQL in Docker!"
        echo ""
        echo "   To connect to Docker PostgreSQL:"
        POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -1)
        if [ -n "$POSTGRES_CONTAINER" ]; then
            echo "   docker exec -it $POSTGRES_CONTAINER psql -U postgres -d planning_tool -f /path/to/fix-bookmarks.sql"
        fi
    fi
else
    echo "   Docker not available"
fi
echo ""

# 4. Check port 5432
echo "4. Checking port 5432:"
if netstat -tuln 2>/dev/null | grep :5432 > /dev/null || ss -tuln 2>/dev/null | grep :5432 > /dev/null; then
    echo "   ✅ Port 5432 is listening"
    netstat -tuln 2>/dev/null | grep :5432 || ss -tuln 2>/dev/null | grep :5432
else
    echo "   ❌ Port 5432 not listening"
fi
echo ""

# 5. Check backend container env
echo "5. Checking backend container DATABASE_URL:"
if command -v docker &> /dev/null; then
    BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "backend|planning" | grep -v postgres | head -1)
    if [ -n "$BACKEND_CONTAINER" ]; then
        echo "   Backend container: $BACKEND_CONTAINER"
        docker exec $BACKEND_CONTAINER env | grep DATABASE_URL || echo "   DATABASE_URL not found"
    else
        echo "   No backend container found"
    fi
fi
echo ""

echo "=========================================="
echo "Recommendations:"
echo "=========================================="
echo ""
echo "If PostgreSQL is in Docker:"
echo "  1. Copy SQL file into container:"
echo "     docker cp fix-bookmarks.sql <postgres-container>:/tmp/"
echo ""
echo "  2. Execute SQL:"
echo "     docker exec -it <postgres-container> psql -U postgres -d planning_tool -f /tmp/fix-bookmarks.sql"
echo ""
echo "If PostgreSQL is on another server:"
echo "  1. Find the host from backend config"
echo "  2. Run: psql postgresql://user:pass@HOST:5432/planning_tool -f fix-bookmarks.sql"
echo ""
echo "If psql not installed:"
echo "  sudo apt-get update"
echo "  sudo apt-get install postgresql-client"
echo "=========================================="
