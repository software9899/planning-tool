#!/bin/bash

################################################################################
# Planning Tool Local Development Quick Start
# Description: Start all services for local development
# Usage: ./start-local.sh
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   Planning Tool - Local Development Setup      ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker Desktop and try again.${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
    cp .env.development .env
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Check if containers are already running
RUNNING=$(docker compose -f docker-compose.dev.yml ps --services --filter "status=running" 2>/dev/null | wc -l)

if [ "$RUNNING" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some containers are already running${NC}"
    read -p "Stop and restart all services? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}⏸  Stopping existing containers...${NC}"
        docker compose -f docker-compose.dev.yml down
    else
        echo -e "${GREEN}Keeping existing containers running${NC}"
        exit 0
    fi
fi

# Start services
echo -e "${BLUE}🚀 Starting all services...${NC}"
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Check health
echo -e "${BLUE}🏥 Checking service health...${NC}"

SERVICES=(
    "postgres:5432:PostgreSQL"
    "mongodb:27017:MongoDB"
    "backend:8002:Backend API"
    "frontend:3001:Frontend"
    "virtual-office:3000:Virtual Office"
)

ALL_HEALTHY=true

for SERVICE_INFO in "${SERVICES[@]}"; do
    IFS=':' read -r CONTAINER PORT NAME <<< "$SERVICE_INFO"

    if docker ps --filter "name=$CONTAINER" --filter "status=running" | grep -q "$CONTAINER"; then
        echo -e "${GREEN}✓ $NAME is running${NC}"
    else
        echo -e "${YELLOW}⚠ $NAME is not running${NC}"
        ALL_HEALTHY=false
    fi
done

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Planning Tool is ready for development!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📱 Access your applications:${NC}"
echo -e "   • Frontend:       ${GREEN}http://localhost:3001${NC}"
echo -e "   • Backend API:    ${GREEN}http://localhost:8002${NC}"
echo -e "   • API Docs:       ${GREEN}http://localhost:8002/docs${NC}"
echo -e "   • Virtual Office: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}🔐 Default credentials:${NC}"
echo -e "   • Email:    ${GREEN}admin@planningtool.com${NC}"
echo -e "   • Password: ${GREEN}admin123${NC}"
echo ""
echo -e "${BLUE}📊 Database connections:${NC}"
echo -e "   • PostgreSQL: ${GREEN}localhost:5432${NC} (postgres/postgres123)"
echo -e "   • MongoDB:    ${GREEN}localhost:27017${NC} (no auth)"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   • View logs:       ${GREEN}docker compose -f docker-compose.dev.yml logs -f${NC}"
echo -e "   • Stop services:   ${GREEN}docker compose -f docker-compose.dev.yml down${NC}"
echo -e "   • Restart service: ${GREEN}docker compose -f docker-compose.dev.yml restart backend${NC}"
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo -e "   • Local Development: ${GREEN}docs/LOCAL_DEVELOPMENT.md${NC}"
echo -e "   • Project Structure: ${GREEN}PROJECT_STRUCTURE.md${NC}"
echo ""

if [ "$ALL_HEALTHY" = false ]; then
    echo -e "${YELLOW}⚠️  Some services failed to start. Check logs:${NC}"
    echo -e "   ${GREEN}docker compose -f docker-compose.dev.yml logs${NC}"
    echo ""
fi

echo -e "${GREEN}Happy coding! 🚀${NC}"
