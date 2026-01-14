#!/bin/bash

# Deployment script for Planning Tool Backend
# This script handles Docker deployment to production

set -e

echo "=========================================="
echo "Planning Tool Backend - Docker Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect Docker Compose command (v1 or v2)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file from .env.example"
    echo "cp .env.example .env"
    exit 1
fi

# Load environment variables
source .env

echo "📋 Deployment Configuration:"
echo "   Database: ${DATABASE_URL}"
echo ""

# Ask for confirmation
read -p "⚠️  This will rebuild and restart the backend. Continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Step 1: Run migration first
echo ""
echo "========================================"
echo "Step 1: Running Database Migration"
echo "========================================"
echo ""

read -p "Run database migration? (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    echo "🔄 Building migration image..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build migration

    echo "🔄 Running migration..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --profile migration run --rm migration

    echo -e "${GREEN}✅ Migration completed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping migration${NC}"
fi

# Step 2: Build and deploy backend
echo ""
echo "========================================"
echo "Step 2: Building Backend"
echo "========================================"
echo ""

echo "🔨 Building Docker image..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build backend

# Step 3: Stop old container
echo ""
echo "========================================"
echo "Step 3: Stopping Old Container"
echo "========================================"
echo ""

if [ "$(docker ps -q -f name=planning-tool-backend-prod)" ]; then
    echo "🛑 Stopping old container..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down
    echo -e "${GREEN}✅ Old container stopped${NC}"
else
    echo "ℹ️  No running container found"
fi

# Step 4: Start new container
echo ""
echo "========================================"
echo "Step 4: Starting New Container"
echo "========================================"
echo ""

echo "🚀 Starting backend..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d backend

# Step 5: Wait for health check
echo ""
echo "========================================"
echo "Step 5: Health Check"
echo "========================================"
echo ""

echo "⏳ Waiting for backend to be healthy..."
sleep 5

max_attempts=12
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker inspect --format='{{.State.Health.Status}}' planning-tool-backend-prod 2>/dev/null | grep -q "healthy"; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi

    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts - waiting..."
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo "Check logs with: $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs backend"
    exit 1
fi

# Step 6: Show status
echo ""
echo "========================================"
echo "Deployment Complete! ✅"
echo "========================================"
echo ""

$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps

echo ""
echo "📊 Backend logs:"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs --tail=20 backend

echo ""
echo "=========================================="
echo "Useful Commands:"
echo "=========================================="
echo "View logs:        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f backend"
echo "Stop backend:     $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down"
echo "Restart backend:  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml restart backend"
echo "Backend shell:    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec backend bash"
echo "=========================================="
