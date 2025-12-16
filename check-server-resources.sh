#!/bin/bash

echo "🔍 Server Resource Check"
echo "========================"
echo ""

echo "📊 Memory Usage:"
free -h
echo ""

echo "💾 Disk Usage:"
df -h / | tail -1
echo ""

echo "🔢 Running Processes (top 10 by memory):"
ps aux --sort=-%mem | head -11
echo ""

echo "📈 System Load:"
uptime
echo ""

echo "🔐 System Limits:"
ulimit -a | grep -E "max memory|virtual memory|processes"
echo ""

echo "🌐 Network Connections:"
ss -tun | wc -l
echo "   (Total connections)"
echo ""

echo "💡 If Chromium keeps getting killed:"
echo "   1. Check if OOM killer is active: sudo dmesg | grep -i oom | tail -5"
echo "   2. Free up memory by stopping other services"
echo "   3. Consider increasing swap or server RAM"

