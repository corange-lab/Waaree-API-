#!/bin/bash

# Install Playwright system dependencies on Ubuntu server
# Run this on the server with sudo

echo "🔧 Installing Playwright system dependencies..."
echo ""

# Method 1: Use Playwright's install-deps (recommended)
echo "Installing via Playwright install-deps..."
sudo npx playwright install-deps

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Now you can run:"
echo "  npm run login"
echo ""
echo "Or if headless login is needed:"
echo "  sudo apt-get install xvfb"
echo "  xvfb-run -a npm run login"

