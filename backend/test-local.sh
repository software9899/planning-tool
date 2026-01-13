#!/bin/bash

# Test Docker setup locally before deploying to production

set -e

echo "=========================================="
echo "Local Docker Test"
echo "=========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed"
    exit 1
fi

echo "✅ Docker installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not installed"
    exit 1
fi

echo "✅ Docker Compose installed"
echo ""

# Build images
echo "🔨 Building images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Test database
echo ""
echo "🔍 Testing database..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL not ready"
    docker-compose logs postgres
    exit 1
fi

# Test backend
echo ""
echo "🔍 Testing backend..."
max_attempts=12
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:8002 > /dev/null 2>&1; then
        echo "✅ Backend is responding"
        break
    fi

    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend not responding"
    docker-compose logs backend
    exit 1
fi

# Test API endpoints
echo ""
echo "🔍 Testing API endpoints..."

# Test health
if curl -f http://localhost:8002 > /dev/null 2>&1; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed"
fi

# Test bookmarks endpoint
if curl -f http://localhost:8002/api/bookmarks > /dev/null 2>&1; then
    echo "✅ Bookmarks endpoint working"
else
    echo "❌ Bookmarks endpoint failed"
fi

# Test creating bookmark
echo ""
echo "🔍 Testing bookmark creation..."
response=$(curl -s -X POST http://localhost:8002/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Bookmark",
    "url": "https://example.com",
    "category": "Test",
    "tags": ["docker", "test"]
  }')

if echo "$response" | grep -q "Test Bookmark"; then
    echo "✅ Bookmark creation successful"
    echo "   Response: $response"
else
    echo "❌ Bookmark creation failed"
    echo "   Response: $response"
fi

echo ""
echo "=========================================="
echo "✅ All Tests Passed!"
echo "=========================================="
echo ""
echo "Services are running:"
docker-compose ps
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
echo "Ready to deploy to production!"
echo "=========================================="
