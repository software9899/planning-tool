#!/bin/bash
# Start Planning Tool - Production Mode (Full Docker)

echo "🚀 Starting Planning Tool - Production Mode"
echo ""

# Stop any existing Python servers
echo "📋 Cleaning up old services..."
pkill -f "python.*http.server.*3000" 2>/dev/null
pkill -f "python.*ai-backend.py" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null

echo ""
echo "🐳 Starting All Docker services..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 5

# Check database health
until docker exec planning-tool-db pg_isready -U planningtool 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo ""
echo "✅ Production Mode Started!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3001"
echo "   Backend:   http://localhost:8002"
echo "   API Docs:  http://localhost:8002/docs"
echo "   Database:  localhost:5432"
echo ""
echo "📊 Check Status:"
echo "   ./check-status.sh"
echo "   docker-compose ps"
echo ""
echo "🛑 Stop Services:"
echo "   ./stop-prod.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
