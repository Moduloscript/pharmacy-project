#!/bin/bash

# BenPharm Local Redis Server Startup Script
# This script starts a local Redis server for development

echo "🚀 Starting local Redis server for BenPharm development..."

# Option 1: Using Docker (Recommended)
if command -v docker &> /dev/null; then
    echo "✅ Docker found. Starting Redis in Docker..."
    
    # Stop any existing Redis container
    docker stop benpharma-redis-local 2>/dev/null || true
    docker rm benpharma-redis-local 2>/dev/null || true
    
    # Start Redis container
    docker run -d \
        --name benpharma-redis-local \
        -p 6379:6379 \
        -v benpharma-redis-data:/data \
        redis:7-alpine \
        redis-server --appendonly yes
    
    echo "✅ Redis started on localhost:6379"
    echo "📝 Update your .env file to use: REDIS_URL=\"redis://localhost:6379\""
    
# Option 2: Using native Redis installation
elif command -v redis-server &> /dev/null; then
    echo "✅ Redis server found. Starting native Redis..."
    redis-server --port 6379 --appendonly yes &
    echo "✅ Redis started on localhost:6379"
    echo "📝 Update your .env file to use: REDIS_URL=\"redis://localhost:6379\""
    
else
    echo "❌ Neither Docker nor Redis server found!"
    echo "Please install one of the following:"
    echo "1. Docker: https://docs.docker.com/get-docker/"
    echo "2. Redis: https://redis.io/docs/getting-started/"
    echo ""
    echo "For Windows users, we recommend using Docker or WSL2 with Redis."
    exit 1
fi

echo ""
echo "🔧 To stop Redis:"
echo "   Docker: docker stop benpharma-redis-local"
echo "   Native: redis-cli shutdown"
