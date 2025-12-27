#!/bin/bash
# Stop Production Mode

echo "🛑 Stopping Production Mode..."

# Stop all Docker containers
docker-compose stop

echo "✅ Production Mode Stopped"
echo ""
echo "ℹ️  Containers are stopped but not removed"
echo "   To remove: docker-compose down"
echo "   To start prod again: ./start-prod.sh"
