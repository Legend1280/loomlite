#!/bin/bash

# Loom Lite MVP - Startup Script
# Serves both API backend and static frontend

cd "$(dirname "$0")/backend"

echo "🧵 Starting Loom Lite MVP..."
echo "📊 Database: loom_lite.db"
echo "🌐 API: http://localhost:8000"
echo "🎨 Frontend: http://localhost:8000/frontend/"
echo ""

# Start FastAPI with static file serving
python3.11 -c "
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import uvicorn
import sys
sys.path.insert(0, '.')
from main import app

# Mount frontend as static files
app.mount('/frontend', StaticFiles(directory='../frontend'), name='frontend')

# Redirect root to frontend
@app.get('/', include_in_schema=False)
def redirect_to_frontend():
    return RedirectResponse(url='/frontend/index.html')

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
" &

SERVER_PID=$!
echo "✅ Server started (PID: $SERVER_PID)"
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for server to be ready
sleep 2

# Keep script running
wait $SERVER_PID

