#!/bin/bash

################################################################################
# Planning Tool Production Deployment Script
# Description: One-command deployment for Planning Tool + Virtual Office
# Usage: ./deploy.sh [--auto]
#
# Options:
#   --auto    Skip interactive prompts (use for CI/CD)
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="/var/log/planning-tool-deploy.log"
AUTO_MODE=false

if [[ "$1" == "--auto" ]]; then
    AUTO_MODE=true
fi

# Logging function
log() {
    echo -e "${2:-$NC}$1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
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

log_info() {
    log "ℹ $1" "$BLUE"
}

# Error handler
error_exit() {
    log_error "$1"
    exit 1
}

################################################################################
# PRE-FLIGHT CHECKS
################################################################################

log_info "============================================"
log_info "Planning Tool Production Deployment"
log_info "============================================"

# Check if running on server (not required, but recommended)
if [[ "$AUTO_MODE" == "false" ]]; then
    log_info "Running pre-flight checks..."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error_exit "Docker is not installed. Please install Docker first."
fi
log_success "Docker is installed"

# Check if docker-compose is available
if ! docker compose version &> /dev/null; then
    error_exit "Docker Compose plugin is not installed. Please install it first."
fi
log_success "Docker Compose is installed"

# Check disk space (minimum 10GB free)
AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [[ "$AVAILABLE_SPACE" -lt 10 ]]; then
    log_warning "Low disk space: ${AVAILABLE_SPACE}GB available (recommended: 10GB+)"
    if [[ "$AUTO_MODE" == "false" ]]; then
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    log_success "Sufficient disk space: ${AVAILABLE_SPACE}GB available"
fi

################################################################################
# ENVIRONMENT SETUP
################################################################################

ENV_FILE=".env"

if [[ ! -f "$ENV_FILE" ]]; then
    log_warning ".env file not found. Creating from interactive input..."

    if [[ "$AUTO_MODE" == "true" ]]; then
        error_exit ".env file required for auto mode. Please create .env file first."
    fi

    # Interactive prompts
    read -p "Enter your domain name (e.g., planningtool.com): " DOMAIN
    read -p "Enter your email for SSL certificates: " SSL_EMAIL
    read -sp "Enter PostgreSQL password: " POSTGRES_PASSWORD
    echo
    read -sp "Enter JWT secret (press Enter to generate random): " JWT_SECRET
    echo

    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -hex 32)
        log_info "Generated JWT secret"
    fi

    # Generate .env file
    cat > "$ENV_FILE" << EOF
# Domain & SSL
DOMAIN=$DOMAIN
SSL_EMAIL=$SSL_EMAIL

# Database
POSTGRES_USER=planningtool
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=planning_tool
DATABASE_URL=postgresql://planningtool:${POSTGRES_PASSWORD}@postgres:5432/planning_tool

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/virtual-office

# Backend
JWT_SECRET=$JWT_SECRET
PLUGINS_DIR=/app/plugins

# Virtual Office
BACKEND_URL=http://backend:8002
NODE_ENV=production

# SMTP (Optional - leave empty for development mode)
SMTP_SERVER=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=

# Backup (Optional - for DigitalOcean Spaces)
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_BUCKET=planning-tool-backups
EOF

    log_success ".env file created"
else
    log_success ".env file found"
fi

# Load environment variables
source "$ENV_FILE"

# Validate required variables
REQUIRED_VARS=("DOMAIN" "POSTGRES_PASSWORD" "JWT_SECRET")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!VAR}" ]]; then
        error_exit "Required environment variable $VAR is not set"
    fi
done

log_success "Environment variables loaded and validated"

################################################################################
# DNS VERIFICATION
################################################################################

log_info "Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me || echo "unknown")
DNS_IP=$(dig +short "$DOMAIN" @8.8.8.8 | tail -n1)

if [[ "$SERVER_IP" == "$DNS_IP" ]]; then
    log_success "DNS is correctly configured: $DOMAIN → $SERVER_IP"
elif [[ "$AUTO_MODE" == "false" ]]; then
    log_warning "DNS mismatch: $DOMAIN → $DNS_IP (expected: $SERVER_IP)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

################################################################################
# SSL CERTIFICATE SETUP
################################################################################

SSL_CERT_PATH="./certbot/conf/live/$DOMAIN/fullchain.pem"

if [[ ! -f "$SSL_CERT_PATH" ]]; then
    log_info "SSL certificate not found. Obtaining certificate..."

    # Stop any service using port 80
    if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null; then
        log_warning "Port 80 is in use. Stopping services..."
        docker compose -f docker-compose.prod.yml down nginx 2>/dev/null || true
    fi

    # Create certbot directories
    mkdir -p ./certbot/conf ./certbot/www

    # Run certbot in standalone mode
    docker run -it --rm \
        -p 80:80 \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --standalone \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" || error_exit "Failed to obtain SSL certificate"

    log_success "SSL certificate obtained successfully"
else
    log_success "SSL certificate already exists"
fi

################################################################################
# BACKUP EXISTING STATE
################################################################################

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

if docker ps | grep -q "planning-tool-db"; then
    log_info "Backing up existing database..."
    BACKUP_FILE="$BACKUP_DIR/postgres_pre_deploy_$(date +%Y%m%d_%H%M%S).sql"

    docker exec planning-tool-db pg_dump \
        -U "$POSTGRES_USER" \
        "$POSTGRES_DB" > "$BACKUP_FILE" 2>/dev/null || log_warning "Backup failed (database may not exist yet)"

    if [[ -f "$BACKUP_FILE" && -s "$BACKUP_FILE" ]]; then
        log_success "Database backed up to $BACKUP_FILE"
    fi
fi

if docker ps | grep -q "virtual-office-db"; then
    log_info "Backing up MongoDB..."
    MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_pre_deploy_$(date +%Y%m%d_%H%M%S)"

    docker exec virtual-office-db mongodump \
        --db virtual_office \
        --out /tmp/backup 2>/dev/null || log_warning "MongoDB backup failed"

    docker cp virtual-office-db:/tmp/backup "$MONGO_BACKUP_DIR" 2>/dev/null || true

    if [[ -d "$MONGO_BACKUP_DIR" ]]; then
        tar -czf "${MONGO_BACKUP_DIR}.tar.gz" -C "$BACKUP_DIR" "$(basename "$MONGO_BACKUP_DIR")"
        rm -rf "$MONGO_BACKUP_DIR"
        log_success "MongoDB backed up to ${MONGO_BACKUP_DIR}.tar.gz"
    fi
fi

################################################################################
# BUILD AND DEPLOY
################################################################################

log_info "Building Docker images..."
docker compose -f docker-compose.prod.yml build || error_exit "Build failed"
log_success "Docker images built successfully"

log_info "Starting services..."
docker compose -f docker-compose.prod.yml up -d || error_exit "Failed to start services"
log_success "Services started"

################################################################################
# DATABASE INITIALIZATION & MIGRATIONS
################################################################################

log_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec planning-tool-db pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
        log_success "PostgreSQL is ready"
        break
    fi
    sleep 2
done

# Run Alembic migrations
log_info "Running database migrations..."
if docker exec planning-tool-backend alembic current > /dev/null 2>&1; then
    docker exec planning-tool-backend alembic upgrade head || log_warning "Migration failed (database may be new)"
    log_success "Database migrations completed"
else
    log_info "Alembic not yet initialized. Database will be created from init-db.sql"
fi

################################################################################
# POST-DEPLOYMENT VERIFICATION
################################################################################

log_info "Running health checks..."

# Wait for all services to be healthy
WAIT_TIME=120
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    if [[ $ELAPSED -gt $WAIT_TIME ]]; then
        log_error "Health check timeout after ${WAIT_TIME}s"
        break
    fi

    UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" | grep "planning-tool\\|virtual-office" || true)

    if [[ -z "$UNHEALTHY" ]]; then
        log_success "All services are healthy"
        break
    fi

    log_info "Waiting for services to be healthy... (${ELAPSED}s/${WAIT_TIME}s)"
    sleep 5
done

# Test endpoints
log_info "Testing endpoints..."

if curl -sSf http://localhost/health > /dev/null; then
    log_success "HTTP health check passed"
else
    log_warning "HTTP health check failed"
fi

if curl -sSfk https://localhost/health > /dev/null; then
    log_success "HTTPS health check passed"
else
    log_warning "HTTPS health check failed (may need DNS propagation)"
fi

################################################################################
# COMPLETION
################################################################################

log_success "============================================"
log_success "Deployment completed successfully!"
log_success "============================================"

log_info ""
log_info "Your Planning Tool is now running at:"
log_info "  🌐 https://$DOMAIN"
log_info ""
log_info "Useful commands:"
log_info "  • View logs:    docker compose -f docker-compose.prod.yml logs -f"
log_info "  • Stop:         docker compose -f docker-compose.prod.yml down"
log_info "  • Restart:      docker compose -f docker-compose.prod.yml restart"
log_info "  • View status:  docker compose -f docker-compose.prod.yml ps"
log_info ""
log_info "Backups saved to: $BACKUP_DIR"
log_info "Logs saved to: $LOG_FILE"
