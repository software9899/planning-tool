#!/bin/bash
# Start Planning Tool - Development Mode

echo "🚀 Starting Planning Tool - Development Mode"
echo ""

# Stop any existing services first
echo "📋 Cleaning up old services..."
pkill -f "python.*http.server.*3000" 2>/dev/null
pkill -f "python.*ai-backend.py" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Stop frontend container if running
docker stop planning-tool-frontend 2>/dev/null

echo ""
echo "🐳 Starting Docker services (Database + Backend)..."
# Start only db and backend containers
docker-compose up -d db backend

# Wait for database
echo "⏳ Waiting for database..."
sleep 5

# Check database health
until docker exec planning-tool-db pg_isready -U planningtool 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo ""
echo "🐍 Starting Python HTTP Server (Frontend)..."
cd /Users/testtorial/Documents/MCP/planning-tool
nohup python3 -m http.server 3000 > /tmp/web-server.log 2>&1 &

# Wait a bit
sleep 2

echo ""
echo "✅ Development Mode Started!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8002"
echo "   API Docs:  http://localhost:8002/docs"
echo "   Database:  localhost:5432"
echo ""
echo "📊 Check Status:"
echo "   ./check-status.sh"
echo ""
echo "🛑 Stop Services:"
echo "   ./stop-dev.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
