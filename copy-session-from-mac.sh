#!/bin/bash

# Script to copy session from Mac to server
# Run this on your Mac after logging in locally

echo "📋 Copy Session from Mac to Server"
echo "==================================="
echo ""
echo "This script copies waaree-state.json from your Mac to the server"
echo "so you don't need to login on the low-memory server."
echo ""
echo "Prerequisites:"
echo "  1. You've logged in on your Mac: npm run login"
echo "  2. You have SSH access to the server"
echo ""

read -p "Enter server IP or hostname [144.24.114.26]: " SERVER_IP
SERVER_IP=${SERVER_IP:-144.24.114.26}

read -p "Enter server username [ubuntu]: " SERVER_USER
SERVER_USER=${SERVER_USER:-ubuntu}

read -p "Enter server path [~/waaree-api]: " SERVER_PATH
SERVER_PATH=${SERVER_PATH:-~/waaree-api}

if [ ! -f "waaree-state.json" ]; then
    echo "❌ Error: waaree-state.json not found in current directory"
    echo "   Please run 'npm run login' first on your Mac"
    exit 1
fi

echo ""
echo "📤 Copying waaree-state.json to server..."
scp waaree-state.json ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/waaree-state.json

if [ $? -eq 0 ]; then
    echo "✅ Session file copied successfully!"
    echo ""
    echo "Next steps on server:"
    echo "  1. cd ~/waaree-api"
    echo "  2. node api-lightweight.js  # Test it"
    echo "  3. pm2 restart waaree-api"
    echo "  4. curl http://localhost:8888/combined"
else
    echo "❌ Failed to copy session file"
    exit 1
fi

