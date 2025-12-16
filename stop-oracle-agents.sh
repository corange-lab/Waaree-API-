#!/bin/bash

echo "🛑 Stopping Oracle Cloud Agent Processes"
echo "========================================"
echo ""

echo "📊 Memory before:"
free -h | grep Mem
echo ""

echo "🔍 Finding Oracle Cloud Agent processes..."
ORACLE_PROCS=$(ps aux | grep -E "oracle-cloud-agent|oci-wlp|gomon" | grep -v grep)

if [ -z "$ORACLE_PROCS" ]; then
    echo "   ✅ No Oracle Cloud Agent processes found"
else
    echo "   Found Oracle Cloud Agent processes:"
    echo "$ORACLE_PROCS" | awk '{printf "   PID %-8s %6s MB - %s\n", $2, $6/1024, $11}'
    echo ""
    
    echo "⚠️  Stopping Oracle Cloud Agent processes..."
    echo "$ORACLE_PROCS" | awk '{print $2}' | while read pid; do
        if [ ! -z "$pid" ]; then
            echo "   Stopping PID: $pid"
            sudo kill -STOP "$pid" 2>/dev/null || true
        fi
    done
    
    sleep 2
    
    echo ""
    echo "📊 Memory after:"
    free -h | grep Mem
    echo ""
    echo "✅ Oracle Cloud Agent processes stopped (paused)"
    echo "   Note: They will restart on server reboot"
fi

echo ""
echo "💡 To permanently disable (not recommended):"
echo "   sudo systemctl stop snap.oracle-cloud-agent.oracle-cloud-agent.service"
echo "   sudo systemctl disable snap.oracle-cloud-agent.oracle-cloud-agent.service"

