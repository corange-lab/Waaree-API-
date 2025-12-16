#!/bin/bash

echo "🔍 Server Connection Test"
echo "========================"
echo ""

echo "1️⃣  Check if server process is running:"
ps aux | grep "[n]ode.*server.js" || echo "   ❌ No server.js process found"
echo ""

echo "2️⃣  Check if port 8888 is listening:"
ss -tlnp | grep 8888 || netstat -tlnp 2>/dev/null | grep 8888 || echo "   ❌ Port 8888 is NOT listening"
echo ""

echo "3️⃣  Check PM2 status:"
pm2 list
echo ""

echo "4️⃣  Try connecting to localhost:"
curl -v http://localhost:8888/combined 2>&1 | head -20 || echo "   ❌ Connection failed"
echo ""

echo "5️⃣  Check recent server logs:"
pm2 logs waaree-api --lines 15 --nostream
echo ""

echo "6️⃣  Check for errors:"
pm2 logs waaree-api --err --lines 10 --nostream | tail -10

