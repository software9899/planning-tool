#!/bin/bash

# Script เพื่อหา database credentials บน production server

echo "=========================================="
echo "Finding Database Credentials"
echo "=========================================="
echo ""

echo "🔍 Searching for database credentials..."
echo ""

# Check .env file
echo "1. Checking .env file:"
if [ -f .env ]; then
    grep -E "DATABASE_URL|DB_HOST|DB_USER|DB_PASSWORD|DB_NAME" .env 2>/dev/null || echo "   Not found in .env"
else
    echo "   .env file not found"
fi
echo ""

# Check docker-compose files
echo "2. Checking docker-compose files:"
for file in docker-compose.yml docker-compose.*.yml; do
    if [ -f "$file" ]; then
        echo "   From $file:"
        grep -E "POSTGRES_|DATABASE_URL|DB_" "$file" 2>/dev/null || echo "   Not found"
    fi
done
echo ""

# Check environment variables
echo "3. Checking environment variables:"
env | grep -E "DATABASE_URL|POSTGRES_|DB_" 2>/dev/null || echo "   Not found in environment"
echo ""

# Check running Docker containers
echo "4. Checking Docker containers:"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Image}}" | grep -E "postgres|backend"
    echo ""
    echo "   To see container env variables:"
    echo "   docker inspect <container-name> | grep -A 20 Env"
else
    echo "   Docker not available"
fi
echo ""

# Check PM2
echo "5. Checking PM2 processes:"
if command -v pm2 &> /dev/null; then
    pm2 list 2>/dev/null
    echo ""
    echo "   To see PM2 env variables:"
    echo "   pm2 env <app-id>"
else
    echo "   PM2 not available"
fi
echo ""

echo "=========================================="
echo "Common locations to check:"
echo "=========================================="
echo "- /var/www/planning-tool/backend/.env"
echo "- /var/www/planning-tool/backend/docker-compose.yml"
echo "- ~/.bashrc or ~/.profile"
echo "- /etc/environment"
echo ""
echo "Commands to try:"
echo "  cat .env | grep DATABASE"
echo "  docker inspect <backend-container> | grep DATABASE"
echo "  pm2 env <backend-id>"
echo "=========================================="
