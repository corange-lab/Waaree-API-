#!/bin/bash
# Manual Update Commands for Server
# Copy and paste these commands on your server after SSH'ing in

echo "📥 Pulling latest code..."
cd ~/waaree-api
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔄 Restarting PM2 service..."
pm2 restart waaree-api

echo "✅ Checking service status..."
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

