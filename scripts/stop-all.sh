#!/bin/bash

echo "🛑 Stopping Planning Tool..."
docker-compose down

echo "🛑 Stopping Virtual Office..."
docker-compose -f docker-compose.virtual-office.yml -p virtual-office down

echo ""
echo "✅ All services stopped!"
