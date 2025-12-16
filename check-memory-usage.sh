#!/bin/bash

echo "🔍 Detailed Memory Analysis"
echo "==========================="
echo ""

echo "📊 Memory Breakdown:"
free -h
echo ""

echo "🔢 Top 20 Processes by Memory (with details):"
ps aux --sort=-%mem | head -21
echo ""

echo "💾 Memory by Process Type:"
echo "System processes:"
ps aux | grep -E "systemd|kernel|init" | awk '{sum+=$6} END {print "   Total: " sum/1024 " MB"}'
echo ""

echo "Node.js processes:"
ps aux | grep "[n]ode" | awk '{sum+=$6; print "   PID " $2 ": " $6/1024 " MB - " $11} END {print "   Total: " sum/1024 " MB"}'
echo ""

echo "Other processes:"
ps aux | grep -vE "systemd|kernel|init|node|grep" | awk '{sum+=$6} END {print "   Total: " sum/1024 " MB"}'
echo ""

echo "🔐 Check for memory limits:"
echo "System limits:"
ulimit -a | grep -E "memory|virtual"
echo ""

echo "Cgroup memory limits (if any):"
if [ -f /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
    LIMIT=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
    echo "   Cgroup limit: $((LIMIT/1024/1024)) MB"
else
    echo "   No cgroup limits found"
fi

echo ""
echo "💡 If Chromium keeps getting killed with 300MB+ free:"
echo "   - Server might have a hard memory limit"
echo "   - Chromium might need more than available"
echo "   - Consider upgrading server RAM to 2GB+"

