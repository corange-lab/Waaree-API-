#!/bin/bash
# Quick test script for Waaree API endpoint

echo "Testing Waaree API Endpoint..."
echo "URL: http://144.24.114.26:8888"
echo ""

response=$(curl -s --max-time 15 http://144.24.114.26:8888 2>&1)

if echo "$response" | grep -q "powerOutput"; then
    echo "✅ SUCCESS! API is accessible"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "❌ Connection failed or incorrect response"
    echo "Response: $response"
    echo ""
    echo "Check:"
    echo "1. Security List has rule for port 8888"
    echo "2. Rule has Source: 0.0.0.0/0"
    echo "3. Wait 1-2 minutes after adding rule"
fi

