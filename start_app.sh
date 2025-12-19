#!/bin/bash
# Script to start both backend and frontend servers

echo "=========================================="
echo "Starting Soccer Analytics App"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ports are in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Check backend port
if check_port 8000; then
    echo -e "${YELLOW}⚠️  Port 8000 is already in use (backend might be running)${NC}"
else
    echo -e "${GREEN}✅ Port 8000 is available${NC}"
fi

# Check frontend port
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use (frontend might be running)${NC}"
else
    echo -e "${GREEN}✅ Port 3000 is available${NC}"
fi

echo ""
echo "=========================================="
echo "Starting Backend Server (Port 8000)"
echo "=========================================="
echo ""

cd backend

# Check if virtual environment exists
if [ -d "../venv-3.10.0" ]; then
    echo "Activating virtual environment..."
    source ../venv-3.10.0/bin/activate
fi

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  FastAPI not found. Installing dependencies...${NC}"
    # Using canonical requirements.txt from project root
    pip install -r ../requirements.txt --quiet
fi

# Start backend in background
echo -e "${BLUE}Starting backend server...${NC}"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "Backend logs: backend.log"

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Check if backend started successfully
if curl -s http://localhost:8000/api/cache/stats > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:8000${NC}"
    echo -e "${GREEN}✅ API docs: http://localhost:8000/docs${NC}"
else
    echo -e "${YELLOW}⚠️  Backend might still be starting...${NC}"
fi

echo ""
echo "=========================================="
echo "Starting Frontend Server (Port 3000)"
echo "=========================================="
echo ""

cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${BLUE}Starting frontend server...${NC}"
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "Frontend logs: frontend.log"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ SERVERS STARTING!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Backend:${NC}  http://localhost:8000"
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo "The frontend will open automatically in your browser!"
echo ""
echo "To stop servers, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  or: pkill -f 'uvicorn app:app'"
echo "  or: pkill -f 'react-scripts start'"
echo ""
echo "View logs:"
echo "  tail -f backend.log"
echo "  tail -f frontend.log"
echo ""

