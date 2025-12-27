#!/bin/bash

echo "🚀 Starting Planning Tool with Docker Compose..."
echo ""

# Stop any running containers
echo "Stopping existing containers..."
docker compose down

# Build and start all services
echo "Building and starting services..."
docker compose up --build -d

# Wait for services to be ready
echo ""
echo "Waiting for services to start..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "✅ Planning Tool is running!"
echo ""
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:8002"
echo "🔍 API Docs: http://localhost:8002/docs"
echo "🗄️  Database: localhost:5432"
echo ""
echo "📝 View logs: docker compose logs -f"
echo "🛑 Stop all: docker compose down"
