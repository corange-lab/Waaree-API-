#!/bin/bash

echo "🔍 Detailed Memory Analysis"
echo "==========================="
echo ""

echo "📊 Memory Breakdown:"
free -h
echo ""

echo "🔢 Top 20 Processes by Memory (with details):"
ps aux --sort=-%mem 2>/dev/null | head -21 || ps -eo pid,user,%mem,%cpu,comm --sort=-%mem | head -21
echo ""

echo "💾 Memory by Process Type:"
echo "System processes:"
SYSTEM_MEM=$(ps aux 2>/dev/null | grep -E "systemd|kernel|init" | awk '{sum+=$6} END {print sum/1024}')
echo "   Total: ${SYSTEM_MEM:-0} MB"
echo ""

echo "Node.js processes:"
NODE_PROCS=$(ps aux 2>/dev/null | grep "[n]ode" || echo "")
if [ ! -z "$NODE_PROCS" ]; then
    echo "$NODE_PROCS" | awk '{print "   PID " $2 ": " $6/1024 " MB - " $11}'
    NODE_TOTAL=$(echo "$NODE_PROCS" | awk '{sum+=$6} END {print sum/1024}')
    echo "   Total: ${NODE_TOTAL:-0} MB"
else
    echo "   No Node.js processes found"
fi
echo ""

echo "Top memory consumers (all processes):"
ps aux 2>/dev/null | sort -k4 -rn | head -15 | awk '{printf "   %6s MB (%5s%%) - %s\n", $6/1024, $4, $11}'
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

