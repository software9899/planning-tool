#!/bin/bash

echo "🚀 Starting Planning Tool..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check PostgreSQL
echo -e "${BLUE}[1/3] Checking PostgreSQL...${NC}"
if pg_isready -q; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo "Starting PostgreSQL..."
    brew services start postgresql
    sleep 2
fi

# Start Backend
echo -e "${BLUE}[2/3] Starting Backend (FastAPI)...${NC}"
cd /Users/testtorial/Documents/MCP/planning-tool/backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID) on port 8002${NC}"

# Start Frontend
echo -e "${BLUE}[3/3] Starting Frontend (Vite)...${NC}"
cd /Users/testtorial/Documents/MCP/planning-tool/planning-tool-react
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID) on port 5173${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 All services started!${NC}"
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8002"
echo "  API Docs: http://localhost:8002/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=========================================="

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT
wait
