#!/bin/bash

echo "🚀 Starting Planning Tool..."
docker-compose up -d

echo "🎮 Starting Virtual Office..."
docker-compose -f docker-compose.virtual-office.yml -p virtual-office up -d

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 Access URLs:"
echo "  • Planning Tool:  http://localhost:80"
echo "  • Backend API:    http://localhost:8002"
echo "  • Virtual Office: http://localhost:3000"
