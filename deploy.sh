#!/bin/bash

# Deployment script for Waaree API server
# Usage: ./deploy.sh

SSH_KEY='/Volumes/Data/Oracle Instance /IMEI CHECKER/ssh-key-2025-10-20.key'
SERVER='ubuntu@144.24.114.26'

echo "🚀 Deploying to server: $SERVER"
echo "📦 Pulling latest code from GitHub..."

# SSH into server and update
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $SERVER << 'ENDSSH'
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

