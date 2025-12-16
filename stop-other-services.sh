#!/bin/bash

echo "🛑 Stopping Non-Essential Services"
echo "==================================="
echo ""

# List all PM2 processes
echo "📦 Current PM2 Processes:"
pm2 list
echo ""

# Ask which to stop (or stop all except waaree-api)
echo "🔄 Stopping all PM2 processes except waaree-api..."
pm2 list | grep -v "waaree-api" | grep "online" | awk '{print $2}' | while read name; do
    if [ ! -z "$name" ] && [ "$name" != "waaree-api" ]; then
        echo "   Stopping: $name"
        pm2 stop "$name" 2>/dev/null || true
    fi
done

# Kill other Node processes (not from PM2)
echo ""
echo "🔍 Finding other Node.js processes..."
OTHER_NODE=$(ps aux | grep "[n]ode" | grep -v "pm2" | grep -v "waaree-api" | awk '{print $2}')
if [ ! -z "$OTHER_NODE" ]; then
    echo "   Found other Node processes, stopping them..."
    echo "$OTHER_NODE" | while read pid; do
        if [ ! -z "$pid" ]; then
            echo "   Killing Node PID: $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    sleep 2
else
    echo "   ✅ No other Node processes found"
fi

echo ""
echo "📊 Updated PM2 Status:"
pm2 list

echo ""
echo "💾 Current Memory:"
free -h

echo ""
echo "✅ Done! Now restart waaree-api:"
echo "   pm2 restart waaree-api"
echo "   sleep 10"
echo "   node test-login.js"

