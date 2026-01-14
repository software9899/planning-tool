#!/bin/bash

# Fix database schema ใน Docker โดยตรง

set -e

echo "=========================================="
echo "Fix Database in Docker"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ใช้ docker compose หรือ docker-compose
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

# 1. หา PostgreSQL container
echo -e "${BLUE}🔍 Finding PostgreSQL container...${NC}"
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}❌ PostgreSQL container not found${NC}"
    echo ""
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    echo ""
    read -p "Enter PostgreSQL container name: " POSTGRES_CONTAINER
fi

echo -e "${GREEN}✅ Found PostgreSQL container: $POSTGRES_CONTAINER${NC}"
echo ""

# 2. Copy SQL file to container
echo -e "${BLUE}📋 Copying SQL file to container...${NC}"
docker cp fix-bookmarks.sql $POSTGRES_CONTAINER:/tmp/fix-bookmarks.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SQL file copied${NC}"
else
    echo -e "${RED}❌ Failed to copy SQL file${NC}"
    exit 1
fi
echo ""

# 3. Execute SQL in container
echo -e "${BLUE}🔄 Executing SQL migration...${NC}"
docker exec -i $POSTGRES_CONTAINER psql -U postgres -d planning_tool -f /tmp/fix-bookmarks.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migration successful!${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
echo ""

# 4. Clean up
docker exec $POSTGRES_CONTAINER rm /tmp/fix-bookmarks.sql

# 5. Restart backend
echo -e "${BLUE}🔄 Finding backend container...${NC}"
BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "backend|planning" | grep -v postgres | head -1)

if [ -n "$BACKEND_CONTAINER" ]; then
    echo -e "${GREEN}✅ Found backend: $BACKEND_CONTAINER${NC}"
    echo ""

    read -p "Restart backend container? (yes/no) [yes]: " RESTART
    RESTART=${RESTART:-yes}

    if [[ $RESTART =~ ^[Yy]es$ ]]; then
        echo -e "${BLUE}🔄 Restarting backend...${NC}"
        docker restart $BACKEND_CONTAINER

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Backend restarted${NC}"
        else
            echo -e "${RED}❌ Failed to restart backend${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Backend container not found${NC}"
    echo ""
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}"
    echo ""
    echo "To restart manually:"
    echo "  docker restart <backend-container-name>"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Done!${NC}"
echo "=========================================="
echo ""
echo "Test the API:"
echo "  curl http://68.183.227.173:8002/api/bookmarks"
echo ""
echo "Should return 200 OK (not 500)"
echo "=========================================="
