#!/bin/bash

echo "🔄 Force Restart Server (Clear Cache)"
echo "======================================"
echo ""

echo "1️⃣  Stopping PM2..."
pm2 stop waaree-api
pm2 delete waaree-api

echo ""
echo "2️⃣  Verifying code is up to date..."
cd ~/waaree-api
git pull origin main

echo ""
echo "3️⃣  Checking for fs duplicates in autoLogin.js..."
FS_COUNT=$(grep -c "const fs = require('fs')" autoLogin.js)
echo "   Found $FS_COUNT fs declarations (should be 1)"

if [ "$FS_COUNT" -gt 1 ]; then
    echo "   ⚠️  Still has duplicates! File might not be updated."
    echo "   Checking file..."
    grep -n "const fs" autoLogin.js
else
    echo "   ✅ File looks correct"
fi

echo ""
echo "4️⃣  Starting server fresh..."
pm2 start server.js --name waaree-api

echo ""
echo "5️⃣  Waiting for server to start..."
sleep 5

echo ""
echo "6️⃣  Checking status..."
pm2 list

echo ""
echo "7️⃣  Testing endpoint..."
curl -s http://localhost:8888/combined | head -c 200 || echo "   ❌ Server not responding"

echo ""
echo "8️⃣  Recent logs:"
pm2 logs waaree-api --lines 5 --nostream

