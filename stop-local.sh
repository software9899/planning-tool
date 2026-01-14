#!/bin/bash

################################################################################
# Planning Tool Local Development Stop Script
# Description: Stop all local development services
# Usage: ./stop-local.sh [--clean]
################################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

CLEAN_VOLUMES=false

if [[ "$1" == "--clean" ]]; then
    CLEAN_VOLUMES=true
fi

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║   Planning Tool - Stop Local Development      ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if containers are running
RUNNING=$(docker compose -f docker-compose.dev.yml ps --services --filter "status=running" 2>/dev/null | wc -l)

if [ "$RUNNING" -eq 0 ]; then
    echo -e "${GREEN}✓ No services are currently running${NC}"
    exit 0
fi

echo -e "${BLUE}🛑 Stopping all services...${NC}"

if [ "$CLEAN_VOLUMES" = true ]; then
    echo -e "${YELLOW}⚠️  WARNING: This will delete all database data!${NC}"
    read -p "Are you sure? Type 'yes' to continue: " CONFIRM

    if [[ "$CONFIRM" == "yes" ]]; then
        docker compose -f docker-compose.dev.yml down -v
        echo -e "${GREEN}✓ Services stopped and volumes deleted${NC}"
    else
        echo -e "${BLUE}Cancelled. Stopping services without deleting volumes...${NC}"
        docker compose -f docker-compose.dev.yml down
        echo -e "${GREEN}✓ Services stopped (data preserved)${NC}"
    fi
else
    docker compose -f docker-compose.dev.yml down
    echo -e "${GREEN}✓ Services stopped (data preserved)${NC}"
fi

echo ""
echo -e "${BLUE}To start services again, run:${NC}"
echo -e "   ${GREEN}./start-local.sh${NC}"
echo ""
echo -e "${BLUE}To completely reset (delete all data), run:${NC}"
echo -e "   ${GREEN}./stop-local.sh --clean${NC}"
echo ""
