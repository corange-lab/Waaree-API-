#!/bin/bash

echo "🔍 Identifying Resource-Heavy Services"
echo "======================================"
echo ""

echo "📊 Current Memory Usage:"
free -h
echo ""

echo "🔢 Top 10 Processes by Memory:"
ps aux --sort=-%mem | head -11 | awk '{printf "%-8s %6s %6s %s\n", $1, $3"%", $4"%", $11}'
echo ""

echo "⚡ Top 10 Processes by CPU:"
ps aux --sort=-%cpu | head -11 | awk '{printf "%-8s %6s %6s %s\n", $1, $3"%", $4"%", $11}'
echo ""

echo "📦 All PM2 Processes:"
pm2 list
echo ""

echo "🌐 All Node Processes:"
ps aux | grep node | grep -v grep | awk '{printf "PID: %-8s MEM: %6s%% CPU: %6s%% %s\n", $2, $4, $3, $11}'
echo ""

echo "💡 Recommendations:"
echo "==================="

# Check for other Node processes
NODE_COUNT=$(ps aux | grep -c "[n]ode")
if [ "$NODE_COUNT" -gt 1 ]; then
    echo "⚠️  Found $NODE_COUNT Node.js processes running"
    echo "   Consider stopping unnecessary Node services"
fi

# Check PM2 processes
PM2_COUNT=$(pm2 list | grep -c "online")
if [ "$PM2_COUNT" -gt 1 ]; then
    echo "⚠️  Found $PM2_COUNT PM2 processes running"
    echo "   You can stop others with: pm2 stop <name>"
fi

# Check system services
SYSTEMD_SERVICES=$(systemctl list-units --type=service --state=running 2>/dev/null | grep -E "node|npm|waaree" | wc -l)
if [ "$SYSTEMD_SERVICES" -gt 0 ]; then
    echo "⚠️  Found systemd services that might be using resources"
fi

echo ""
echo "🚀 To free up resources, you can:"
echo "   1. Stop other PM2 processes: pm2 stop <name>"
echo "   2. Kill other Node processes: kill <pid>"
echo "   3. Stop unnecessary system services"
echo "   4. Restart waaree-api: pm2 restart waaree-api"

