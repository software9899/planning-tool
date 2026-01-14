#!/bin/bash

# Stop backend

echo "🛑 Stopping backend..."
pkill -f "uvicorn main:app"

if [ $? -eq 0 ]; then
    echo "✅ Backend stopped"
else
    echo "ℹ️  Backend not running"
fi
