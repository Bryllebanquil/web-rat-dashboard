#!/bin/bash

# Neural Control Hub - Run Script
# This script starts both the Python backend and React frontend

echo "🚀 Starting Neural Control Hub..."

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Python backend
echo "🐍 Starting Python backend..."
source venv/bin/activate
python controller.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start React frontend
echo "⚛️  Starting React frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "📊 Backend: http://localhost:8080"
echo "🎨 Frontend: http://localhost:5173 (or check terminal output)"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait