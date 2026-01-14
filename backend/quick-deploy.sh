#!/bin/bash

# Simple deployment without Docker
# Just Python + uvicorn

set -e

echo "=========================================="
echo "Planning Tool - Simple Deployment"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found${NC}"
    echo "Install: sudo apt-get install python3 python3-pip"
    exit 1
fi

echo -e "${GREEN}✅ Python3 found${NC}"
echo ""

# Database info
echo -e "${BLUE}📝 Database Configuration${NC}"
read -p "Database Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database Name [planning_tool]: " DB_NAME
DB_NAME=${DB_NAME:-planning_tool}

read -p "Database User [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Database Password: " DB_PASSWORD
echo ""
echo ""

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
export PLUGINS_DIR="$(pwd)/../plugins"

# Install dependencies
echo -e "${BLUE}📦 Installing Python packages...${NC}"
pip3 install --quiet -r requirements.txt
echo -e "${GREEN}✅ Packages installed${NC}"
echo ""

# Run migration
echo -e "${BLUE}🔄 Running database migration...${NC}"
read -p "Run migration? (yes/no): " -r
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    python3 migrate_bookmarks_tags.py
    echo -e "${GREEN}✅ Migration complete${NC}"
else
    echo "⚠️  Skipped migration"
fi
echo ""

# Kill old process
echo -e "${BLUE}🛑 Stopping old backend (if running)...${NC}"
pkill -f "uvicorn main:app" || true
sleep 2

# Start backend
echo -e "${BLUE}🚀 Starting backend...${NC}"
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8002 > backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait and check
sleep 3
if ps -p $BACKEND_PID > /dev/null; then
    echo "=========================================="
    echo -e "${GREEN}✅ Deployment Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Backend running on: http://localhost:8002"
    echo "Process ID: $BACKEND_PID"
    echo ""
    echo "Useful commands:"
    echo "  View logs:  tail -f backend.log"
    echo "  Stop:       pkill -f 'uvicorn main:app'"
    echo "  Check:      ps aux | grep uvicorn"
    echo "=========================================="
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Check logs: cat backend.log"
    exit 1
fi
