#!/bin/bash
# Check Planning Tool Status

echo "📊 Planning Tool Status Check"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Python HTTP Server
echo "🐍 Python HTTP Server (Dev Mode):"
if lsof -i :3000 >/dev/null 2>&1; then
    echo "   ✅ Running on port 3000"
    echo "   📍 http://localhost:3000"
else
    echo "   ❌ Not running"
fi
echo ""

# Check Docker Containers
echo "🐳 Docker Containers:"
docker ps --filter "name=planning-tool" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "   ❌ No containers running"
echo ""

# Check specific ports
echo "🔌 Port Status:"
for port in 3000 3001 5432 8002 11434; do
    if lsof -i :$port >/dev/null 2>&1; then
        service=$(lsof -i :$port | tail -1 | awk '{print $1}')
        echo "   ✅ Port $port - $service"
    else
        echo "   ❌ Port $port - Not in use"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access URLs:"
echo "   Dev Frontend:   http://localhost:3000"
echo "   Prod Frontend:  http://localhost:3001"
echo "   Backend API:    http://localhost:8002"
echo "   API Docs:       http://localhost:8002/docs"
echo ""
echo "📝 Quick Actions:"
echo "   Start Dev:  ./start-dev.sh"
echo "   Start Prod: ./start-prod.sh"
echo "   Stop Dev:   ./stop-dev.sh"
echo "   Stop Prod:  ./stop-prod.sh"
