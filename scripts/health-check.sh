#!/bin/bash

################################################################################
# Planning Tool Health Check & Auto-Restart Script
# Description: Monitor services and auto-restart if unhealthy
# Usage: ./health-check.sh
# Cron: */5 * * * * /root/planning-tool/scripts/health-check.sh >> /var/log/health-check.log 2>&1
################################################################################

# Configuration
PROJECT_DIR="/root/planning-tool"
MAX_RETRIES=3
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${2:-$NC}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    log "✓ $1" "$GREEN"
}

log_error() {
    log "✗ $1" "$RED"
}

log_warning() {
    log "⚠ $1" "$YELLOW"
}

# Function to send alert
send_alert() {
    local SERVICE="$1"
    local STATUS="$2"

    if [[ -n "$ALERT_EMAIL" ]]; then
        echo "Service $SERVICE is $STATUS" | mail -s "Planning Tool Alert: $SERVICE $STATUS" "$ALERT_EMAIL"
    fi
}

################################################################################
# CHECK DOCKER CONTAINERS
################################################################################

CONTAINERS=(
    "planning-tool-nginx"
    "planning-tool-db"
    "planning-tool-backend"
    "planning-tool-frontend"
    "virtual-office-db"
    "virtual-office-server"
)

UNHEALTHY_CONTAINERS=()

for CONTAINER in "${CONTAINERS[@]}"; do
    if ! docker ps --filter "name=$CONTAINER" --filter "status=running" | grep -q "$CONTAINER"; then
        log_error "Container $CONTAINER is not running"
        UNHEALTHY_CONTAINERS+=("$CONTAINER")
    fi
done

################################################################################
# CHECK HEALTH ENDPOINTS
################################################################################

# Check HTTP
if ! curl -sSf http://localhost/health > /dev/null 2>&1; then
    log_error "HTTP health check failed"
    UNHEALTHY_CONTAINERS+=("nginx-http")
fi

# Check HTTPS (skip cert verification for self-signed)
if ! curl -sSfk https://localhost/health > /dev/null 2>&1; then
    log_warning "HTTPS health check failed (may be certificate issue)"
fi

# Check backend API
if ! docker exec planning-tool-backend curl -sSf http://localhost:8002/health > /dev/null 2>&1; then
    log_error "Backend API health check failed"
    UNHEALTHY_CONTAINERS+=("backend-api")
fi

################################################################################
# CHECK SYSTEM RESOURCES
################################################################################

# Check disk space (warn if < 10% free)
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ "$DISK_USAGE" -gt 90 ]]; then
    log_error "Disk space critical: ${DISK_USAGE}% used"
    send_alert "Disk Space" "CRITICAL (${DISK_USAGE}%)"
elif [[ "$DISK_USAGE" -gt 80 ]]; then
    log_warning "Disk space high: ${DISK_USAGE}% used"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [[ "$MEMORY_USAGE" -gt 90 ]]; then
    log_error "Memory usage critical: ${MEMORY_USAGE}%"
    send_alert "Memory" "CRITICAL (${MEMORY_USAGE}%)"
elif [[ "$MEMORY_USAGE" -gt 80 ]]; then
    log_warning "Memory usage high: ${MEMORY_USAGE}%"
fi

################################################################################
# AUTO-RESTART UNHEALTHY SERVICES
################################################################################

if [[ ${#UNHEALTHY_CONTAINERS[@]} -gt 0 ]]; then
    log_warning "Found ${#UNHEALTHY_CONTAINERS[@]} unhealthy service(s)"

    for SERVICE in "${UNHEALTHY_CONTAINERS[@]}"; do
        # Extract container name from service name
        CONTAINER_NAME="$SERVICE"

        log "Attempting to restart $CONTAINER_NAME..."

        # Try restart via docker-compose
        cd "$PROJECT_DIR"

        if docker compose -f docker-compose.prod.yml restart "$CONTAINER_NAME" 2>/dev/null; then
            log_success "Restarted $CONTAINER_NAME"

            # Wait and verify
            sleep 10

            if docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" | grep -q "$CONTAINER_NAME"; then
                log_success "$CONTAINER_NAME is now healthy"
                send_alert "$CONTAINER_NAME" "RECOVERED"
            else
                log_error "$CONTAINER_NAME restart failed"
                send_alert "$CONTAINER_NAME" "DOWN"
            fi
        else
            # Try docker restart as fallback
            if docker restart "$CONTAINER_NAME" 2>/dev/null; then
                log_success "Restarted $CONTAINER_NAME (via docker)"
                sleep 10
            else
                log_error "Failed to restart $CONTAINER_NAME"
                send_alert "$CONTAINER_NAME" "RESTART FAILED"
            fi
        fi
    done
else
    log_success "All services are healthy"
fi

################################################################################
# LOG ROTATION (keep last 1000 lines)
################################################################################

LOG_FILE="/var/log/health-check.log"
if [[ -f "$LOG_FILE" ]]; then
    LINE_COUNT=$(wc -l < "$LOG_FILE")
    if [[ "$LINE_COUNT" -gt 1000 ]]; then
        tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
fi
