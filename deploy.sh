#!/bin/bash

# Deployment script for Waaree API server
# Usage: ./deploy.sh [server_user@server_ip]

SERVER=${1:-"root@144.24.114.26"}
APP_DIR="~/waaree-api"

echo "🚀 Deploying to server: $SERVER"
echo "📦 Pulling latest code from GitHub..."

# SSH into server and update
ssh $SERVER << 'ENDSSH'
cd ~/waaree-api
echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies (if any)..."
npm install

echo "🔄 Restarting PM2 service..."
pm2 restart waaree-api

echo "✅ Deployment complete!"
echo "📊 Checking service status..."
pm2 status waaree-api

echo ""
echo "🧪 Testing endpoints..."
echo "Root endpoint:"
curl -s http://localhost:8888 | head -c 200
echo ""
echo ""
echo "Combined endpoint:"
curl -s http://localhost:8888/combined | head -c 300
echo ""
ENDSSH

echo ""
echo "🎉 Deployment finished!"
echo "🌐 Test live server:"
echo "   http://144.24.114.26:8888"
echo "   http://144.24.114.26:8888/combined"

