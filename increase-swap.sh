#!/bin/bash

echo "💾 Increase Swap Space"
echo "======================"
echo ""

# Check current swap
echo "📊 Current Swap Status:"
free -h | grep -i swap
swapon --show
echo ""

# Check available disk space
echo "💿 Available Disk Space:"
df -h / | tail -1
echo ""

# Calculate recommended swap size (2x RAM, but max 4GB for 1GB RAM server)
TOTAL_RAM_MB=$(free -m | grep Mem | awk '{print $2}')
RECOMMENDED_SWAP=$((TOTAL_RAM_MB * 2))
if [ $RECOMMENDED_SWAP -gt 4096 ]; then
    RECOMMENDED_SWAP=4096
fi

echo "💡 Recommended swap size: ${RECOMMENDED_SWAP}MB (2x RAM)"
echo ""

# Check if swap file exists
if [ -f /swapfile ]; then
    echo "⚠️  Swap file already exists at /swapfile"
    echo "   Current size: $(du -h /swapfile | awk '{print $1}')"
    echo ""
    read -p "Do you want to remove old swap and create new one? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Removing old swap..."
        sudo swapoff /swapfile 2>/dev/null
        sudo rm /swapfile
    else
        echo "❌ Aborted. Keeping existing swap."
        exit 0
    fi
fi

echo "🔧 Creating ${RECOMMENDED_SWAP}MB swap file..."
echo "   (This may take a few minutes)"
echo ""

# Create swap file
sudo fallocate -l ${RECOMMENDED_SWAP}M /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=${RECOMMENDED_SWAP}

# Set correct permissions
sudo chmod 600 /swapfile

# Make it swap
sudo mkswap /swapfile

# Enable swap
sudo swapon /swapfile

# Make it permanent
if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
fi

echo ""
echo "✅ Swap increased!"
echo ""
echo "📊 New Swap Status:"
free -h | grep -i swap
swapon --show
echo ""
echo "💡 Note: Swap is slower than RAM. For Chromium, you still need more RAM."
echo "   But increased swap may help prevent OOM kills."

