#!/bin/bash

################################################################################
# Planning Tool Database Restore Script
# Description: Restore PostgreSQL or MongoDB from backup
# Usage: ./restore.sh <postgres|mongodb> <backup-date>
# Example: ./restore.sh postgres 20260114_020000
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${2:-$NC}$1${NC}"
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

# Check arguments
if [[ $# -ne 2 ]]; then
    log_error "Usage: $0 <postgres|mongodb> <backup-date>"
    log "Example: $0 postgres 20260114_020000"
    exit 1
fi

DB_TYPE="$1"
BACKUP_DATE="$2"
BACKUP_DIR="/root/planning-tool/backups"

################################################################################
# POSTGRESQL RESTORE
################################################################################

if [[ "$DB_TYPE" == "postgres" ]]; then
    BACKUP_FILE="$BACKUP_DIR/postgres_${BACKUP_DATE}.sql.gz"

    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        log "Available backups:"
        ls -lh "$BACKUP_DIR"/postgres_*.sql.gz 2>/dev/null || log "No PostgreSQL backups found"
        exit 1
    fi

    log_warning "⚠️  WARNING: This will restore PostgreSQL database from backup!"
    log "Backup file: $BACKUP_FILE"
    log "This will OVERWRITE the current database."
    read -p "Are you sure? Type 'yes' to continue: " CONFIRM

    if [[ "$CONFIRM" != "yes" ]]; then
        log "Restore cancelled"
        exit 0
    fi

    log "Restoring PostgreSQL from $BACKUP_FILE..."

    # Stop backend to prevent connections
    docker compose -f /root/planning-tool/docker-compose.prod.yml stop backend

    # Restore database
    gunzip -c "$BACKUP_FILE" | docker exec -i planning-tool-db psql -U planningtool

    if [[ $? -eq 0 ]]; then
        log_success "PostgreSQL restored successfully"

        # Restart backend
        docker compose -f /root/planning-tool/docker-compose.prod.yml start backend
        log_success "Backend restarted"
    else
        log_error "PostgreSQL restore failed"
        docker compose -f /root/planning-tool/docker-compose.prod.yml start backend
        exit 1
    fi

################################################################################
# MONGODB RESTORE
################################################################################

elif [[ "$DB_TYPE" == "mongodb" ]]; then
    BACKUP_FILE="$BACKUP_DIR/mongodb_${BACKUP_DATE}.tar.gz"

    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        log "Available backups:"
        ls -lh "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null || log "No MongoDB backups found"
        exit 1
    fi

    log_warning "⚠️  WARNING: This will restore MongoDB database from backup!"
    log "Backup file: $BACKUP_FILE"
    log "This will OVERWRITE the current database."
    read -p "Are you sure? Type 'yes' to continue: " CONFIRM

    if [[ "$CONFIRM" != "yes" ]]; then
        log "Restore cancelled"
        exit 0
    fi

    log "Restoring MongoDB from $BACKUP_FILE..."

    # Stop virtual office to prevent connections
    docker compose -f /root/planning-tool/docker-compose.prod.yml stop virtual-office

    # Extract backup
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

    # Copy to container and restore
    docker cp "$TEMP_DIR" virtual-office-db:/tmp/restore
    docker exec virtual-office-db mongorestore --db virtual_office --drop /tmp/restore/mongodb_${BACKUP_DATE}/virtual_office

    if [[ $? -eq 0 ]]; then
        log_success "MongoDB restored successfully"

        # Cleanup
        rm -rf "$TEMP_DIR"

        # Restart virtual office
        docker compose -f /root/planning-tool/docker-compose.prod.yml start virtual-office
        log_success "Virtual Office restarted"
    else
        log_error "MongoDB restore failed"
        rm -rf "$TEMP_DIR"
        docker compose -f /root/planning-tool/docker-compose.prod.yml start virtual-office
        exit 1
    fi

else
    log_error "Invalid database type: $DB_TYPE"
    log "Valid options: postgres, mongodb"
    exit 1
fi

log_success "Restore completed successfully"
