#!/bin/bash

echo "🔍 Server Status Check"
echo "======================"
echo ""

echo "1️⃣  PM2 Status:"
pm2 list
echo ""

echo "2️⃣  Check if port 8888 is listening:"
ss -tlnp | grep 8888 || netstat -tlnp 2>/dev/null | grep 8888 || echo "   ❌ Port 8888 is NOT listening"
echo ""

echo "3️⃣  Check if Node process is running:"
ps aux | grep "[n]ode.*server.js" || echo "   ❌ No server.js process found"
echo ""

echo "4️⃣  Recent PM2 logs (errors):"
pm2 logs waaree-api --err --lines 10 --nostream 2>/dev/null | tail -15 || echo "   No error logs"
echo ""

echo "5️⃣  Recent PM2 logs (output):"
pm2 logs waaree-api --out --lines 10 --nostream 2>/dev/null | tail -15 || echo "   No output logs"
echo ""

echo "6️⃣  Try to start server manually (to see errors):"
echo "   Run: pm2 stop waaree-api && node server.js"
echo "   (Press Ctrl+C after seeing output)"

