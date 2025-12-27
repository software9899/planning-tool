#!/bin/bash
# Stop Development Mode

echo "🛑 Stopping Development Mode..."

# Stop Python HTTP Server
pkill -f "python.*http.server.*3000"

# Stop Docker backend and database (keep them running for reuse)
# docker-compose stop backend db

echo "✅ Development Mode Stopped"
echo ""
echo "ℹ️  Database and Backend containers are still running"
echo "   To stop them: docker-compose stop backend db"
echo "   To start dev again: ./start-dev.sh"
