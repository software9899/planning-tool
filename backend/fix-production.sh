#!/bin/bash

# Fix production database และ restart backend
# ไม่ต้องแตะ Docker เลย

set -e

echo "=========================================="
echo "Fix Production Backend"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Database credentials
echo -e "${BLUE}📝 Database Info${NC}"
read -p "Database Host [68.183.227.173]: " DB_HOST
DB_HOST=${DB_HOST:-68.183.227.173}

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

# Install Python dependencies if needed
if ! python3 -c "import sqlalchemy" &> /dev/null; then
    echo -e "${BLUE}📦 Installing Python packages...${NC}"
    pip3 install sqlalchemy psycopg2-binary --quiet
fi

# Run migration
echo -e "${BLUE}🔄 Running migration...${NC}"
python3 migrate_bookmarks_tags.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration successful!${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Database Fixed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend service on production:"
echo "   - Docker: docker restart <backend-container>"
echo "   - PM2: pm2 restart backend"
echo "   - Systemd: sudo systemctl restart backend"
echo ""
echo "2. Test the API:"
echo "   curl http://68.183.227.173:8002/api/bookmarks"
echo "=========================================="
