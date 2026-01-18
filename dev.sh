#!/bin/bash
# =============================================================================
# LOCAL DEVELOPMENT SCRIPT
# Usage: ./dev.sh [command]
#
# Commands:
#   start     - Start all services (default)
#   stop      - Stop all services
#   restart   - Restart all services
#   logs      - Show logs
#   reset-db  - Reset database (delete data and reinitialize)
#   status    - Show service status
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.dev.yml"

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           🚀 Planning Tool - Local Development                ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_urls() {
    echo ""
    echo -e "${GREEN}✅ Services are running!${NC}"
    echo ""
    echo "📍 Access URLs:"
    echo "   • Frontend:       http://localhost:3001"
    echo "   • Backend API:    http://localhost:8002"
    echo "   • Virtual Office: http://localhost:3000"
    echo ""
    echo "🔑 Login credentials:"
    echo "   • Email:    admin@example.com"
    echo "   • Password: password123"
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo "   • View logs:    ./dev.sh logs"
    echo "   • Stop:         ./dev.sh stop"
    echo "   • Reset DB:     ./dev.sh reset-db"
    echo ""
}

start_services() {
    print_banner
    echo -e "${YELLOW}🔄 Starting services...${NC}"

    docker compose -f $COMPOSE_FILE up -d --build

    echo ""
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    sleep 5

    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -s http://localhost:8002/health > /dev/null 2>&1; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""

    print_urls
}

stop_services() {
    print_banner
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    docker compose -f $COMPOSE_FILE down
    echo -e "${GREEN}✅ All services stopped${NC}"
}

restart_services() {
    stop_services
    start_services
}

show_logs() {
    docker compose -f $COMPOSE_FILE logs -f
}

reset_database() {
    print_banner
    echo -e "${RED}⚠️  WARNING: This will delete all data!${NC}"
    read -p "Are you sure? (y/N): " confirm

    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo -e "${YELLOW}🗑️  Removing containers and volumes...${NC}"
        docker compose -f $COMPOSE_FILE down -v

        echo -e "${YELLOW}🔄 Starting fresh...${NC}"
        start_services
    else
        echo "Cancelled."
    fi
}

show_status() {
    print_banner
    echo -e "${BLUE}📊 Service Status:${NC}"
    echo ""
    docker compose -f $COMPOSE_FILE ps
}

# Main
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    reset-db)
        reset_database
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: ./dev.sh [start|stop|restart|logs|reset-db|status]"
        exit 1
        ;;
esac
