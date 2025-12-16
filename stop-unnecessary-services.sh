#!/bin/bash

echo "🛑 Stopping Unnecessary System Services"
echo "========================================"
echo ""

echo "📊 Memory before:"
free -h | grep Mem
echo ""

echo "🔍 Identifying services to stop..."
echo ""

# Services that are usually safe to stop (non-critical)
SERVICES_TO_STOP=(
    "snapd"                    # Snap package manager (if not using snaps)
    "fwupd"                    # Firmware updater
    "udisks2"                  # Disk management (if not needed)
    "multipathd"               # Multipath daemon (if not using)
    "iscsid"                   # iSCSI daemon (if not using)
)

echo "⚠️  Stopping non-critical services..."
for service in "${SERVICES_TO_STOP[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo "   Stopping: $service"
        sudo systemctl stop "$service" 2>/dev/null || true
        # Don't disable permanently - just stop for now
    fi
done

# Stop Oracle Cloud Agent (if exists)
if systemctl list-units --type=service | grep -q "oracle-cloud-agent"; then
    echo "   Stopping: oracle-cloud-agent"
    sudo systemctl stop snap.oracle-cloud-agent.oracle-cloud-agent.service 2>/dev/null || true
fi

# Stop snapd if not needed
if command -v snap &> /dev/null; then
    echo "   Stopping: snapd (if not using snaps)"
    sudo systemctl stop snapd 2>/dev/null || true
fi

# Kill Oracle Cloud Agent processes
echo ""
echo "🔄 Stopping Oracle Cloud Agent processes..."
ps aux | grep -E "oracle-cloud-agent|oci-wlp|gomon" | grep -v grep | awk '{print $2}' | while read pid; do
    if [ ! -z "$pid" ]; then
        echo "   Stopping PID: $pid"
        sudo kill -STOP "$pid" 2>/dev/null || sudo kill "$pid" 2>/dev/null || true
    fi
done

sleep 2

echo ""
echo "📊 Memory after:"
free -h | grep Mem
echo ""

echo "✅ Services stopped"
echo ""
echo "💡 To restart services later:"
echo "   sudo systemctl start <service-name>"
echo ""
echo "💡 To permanently disable (be careful!):"
echo "   sudo systemctl disable <service-name>"

