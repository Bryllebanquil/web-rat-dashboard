#!/bin/bash

# Run the Advanced RAT Controller
echo "🚀 Starting Advanced RAT Controller..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
echo "📥 Installing dependencies..."
pip install eventlet flask flask-socketio

# Run the controller
echo "🌟 Starting controller on http://localhost:8081"
echo "📋 Login with password: q"
echo "🔗 Open your browser and go to: http://localhost:8081"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python controller.py