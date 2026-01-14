#!/bin/bash

################################################################################
# Planning Tool Automated Backup Script
# Description: Backup PostgreSQL and MongoDB databases
# Usage: ./backup.sh
# Cron: 0 2 * * * /root/planning-tool/scripts/backup.sh >> /var/log/backup.log 2>&1
################################################################################

set -e

# Configuration
BACKUP_DIR="/root/planning-tool/backups"
POSTGRES_CONTAINER="planning-tool-db"
MONGODB_CONTAINER="virtual-office-db"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

################################################################################
# POSTGRESQL BACKUP
################################################################################

log "Starting PostgreSQL backup..."

if docker ps | grep -q "$POSTGRES_CONTAINER"; then
    POSTGRES_FILE="$BACKUP_DIR/postgres_$DATE.sql.gz"

    docker exec "$POSTGRES_CONTAINER" pg_dumpall -U planningtool | gzip > "$POSTGRES_FILE"

    if [[ -f "$POSTGRES_FILE" && -s "$POSTGRES_FILE" ]]; then
        SIZE=$(du -h "$POSTGRES_FILE" | cut -f1)
        log_success "PostgreSQL backup completed: $POSTGRES_FILE ($SIZE)"
    else
        log_error "PostgreSQL backup failed"
        rm -f "$POSTGRES_FILE"
    fi
else
    log_error "PostgreSQL container not running"
fi

################################################################################
# MONGODB BACKUP
################################################################################

log "Starting MongoDB backup..."

if docker ps | grep -q "$MONGODB_CONTAINER"; then
    MONGODB_DIR="$BACKUP_DIR/mongodb_$DATE"
    MONGODB_FILE="${MONGODB_DIR}.tar.gz"

    docker exec "$MONGODB_CONTAINER" mongodump --db virtual_office --out /tmp/backup 2>/dev/null

    docker cp "$MONGODB_CONTAINER:/tmp/backup" "$MONGODB_DIR" 2>/dev/null

    if [[ -d "$MONGODB_DIR" ]]; then
        tar -czf "$MONGODB_FILE" -C "$BACKUP_DIR" "$(basename "$MONGODB_DIR")"
        rm -rf "$MONGODB_DIR"

        SIZE=$(du -h "$MONGODB_FILE" | cut -f1)
        log_success "MongoDB backup completed: $MONGODB_FILE ($SIZE)"
    else
        log_error "MongoDB backup failed"
    fi
else
    log_error "MongoDB container not running"
fi

################################################################################
# CLEANUP OLD BACKUPS
################################################################################

log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

# Delete PostgreSQL backups older than retention period
find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Delete MongoDB backups older than retention period
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

REMAINING=$(ls -1 "$BACKUP_DIR" | wc -l)
log_success "Cleanup completed. $REMAINING backup files remaining."

################################################################################
# OPTIONAL: UPLOAD TO DIGITALOCEAN SPACES
################################################################################

if [[ -n "$DO_SPACES_KEY" && -n "$DO_SPACES_SECRET" && -n "$DO_SPACES_BUCKET" ]]; then
    log "Uploading backups to DigitalOcean Spaces..."

    # Install s3cmd if not present
    if ! command -v s3cmd &> /dev/null; then
        log "Installing s3cmd..."
        apt-get update && apt-get install -y s3cmd > /dev/null 2>&1
    fi

    # Configure s3cmd
    cat > ~/.s3cfg << EOF
[default]
access_key = $DO_SPACES_KEY
secret_key = $DO_SPACES_SECRET
host_base = sfo3.digitaloceanspaces.com
host_bucket = %(bucket)s.sfo3.digitaloceanspaces.com
use_https = True
EOF

    # Upload latest backups
    s3cmd put "$POSTGRES_FILE" "s3://$DO_SPACES_BUCKET/" 2>/dev/null && \
        log_success "PostgreSQL backup uploaded to Spaces"

    s3cmd put "$MONGODB_FILE" "s3://$DO_SPACES_BUCKET/" 2>/dev/null && \
        log_success "MongoDB backup uploaded to Spaces"
fi

log_success "Backup completed successfully"
