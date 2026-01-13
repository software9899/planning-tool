#!/bin/bash

# Quick Start Script for Production Server
# Run this on your production server (68.183.227.173)

set -e

echo "=========================================="
echo "Planning Tool Backend - Quick Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install docker-compose-plugin"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Get database credentials
echo -e "${BLUE}📝 Database Configuration${NC}"
echo ""

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

# Create .env file
echo -e "${YELLOW}📄 Creating .env file...${NC}"

cat > .env << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
PLUGINS_DIR=/app/plugins
LOG_LEVEL=info
PYTHONUNBUFFERED=1
EOF

echo -e "${GREEN}✅ .env file created${NC}"
echo ""

# Test database connection
echo -e "${BLUE}🔌 Testing database connection...${NC}"

if docker run --rm postgres:15-alpine psql "${DATABASE_URL}" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo "Please check your credentials and try again"
    exit 1
fi

echo ""

# Ask about migration
echo -e "${YELLOW}⚠️  Database Migration${NC}"
echo "This will convert bookmarks.tags from ARRAY to JSONB"
echo ""
read -p "Run database migration? (yes/no): " -r
echo

if [[ $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${BLUE}🔄 Running migration...${NC}"

    # Build and run migration
    docker build -f Dockerfile.migration -t planning-tool-migration .
    docker run --rm -e DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" planning-tool-migration

    echo -e "${GREEN}✅ Migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping migration${NC}"
fi

echo ""

# Build and start backend
echo -e "${BLUE}🔨 Building backend image...${NC}"
docker-compose -f docker-compose.prod.yml build backend

echo ""
echo -e "${BLUE}🚀 Starting backend...${NC}"
docker-compose -f docker-compose.prod.yml up -d backend

echo ""
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
sleep 10

# Check health
max_attempts=12
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:8002 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running!${NC}"
        break
    fi

    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo ""
    echo "View logs with:"
    echo "  docker-compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Backend is running on: http://localhost:8002"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose -f docker-compose.prod.yml logs -f backend"
echo "  Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  Restart:      docker-compose -f docker-compose.prod.yml restart backend"
echo "  Shell access: docker-compose -f docker-compose.prod.yml exec backend bash"
echo ""
echo "=========================================="
