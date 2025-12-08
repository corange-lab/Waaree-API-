#!/bin/bash

# Quick fix script for server - run this on the server
# Usage: ./fix-server.sh

echo "🔧 Waaree API Server Fix Script"
echo "================================"
echo ""

cd ~/waaree-api || { echo "❌ Directory not found!"; exit 1; }

echo "1️⃣  Pulling latest code..."
git pull origin main || echo "⚠️  Git pull failed (may not be a git repo)"

echo ""
echo "2️⃣  Installing dependencies..."
npm install

echo ""
echo "3️⃣  Installing Playwright browsers..."
npx playwright install chromium
npx playwright install-deps chromium 2>/dev/null || echo "⚠️  System deps install skipped (may not be needed)"

echo ""
echo "4️⃣  Checking session file..."
if [ ! -f "waaree-state.json" ]; then
    echo "   ❌ Session file NOT found!"
    echo "   📝 You need to run: npm run login"
    echo "   💡 Or copy waaree-state.json from your local machine"
    SESSION_MISSING=1
elif [ ! -s "waaree-state.json" ]; then
    echo "   ⚠️  Session file exists but is EMPTY!"
    echo "   📝 You need to run: npm run login"
    SESSION_MISSING=1
else
    echo "   ✅ Session file exists and has data"
    # Check if it has actual data
    if grep -q "localStorage\|cookies" waaree-state.json 2>/dev/null; then
        echo "   ✅ Session file contains session data"
    else
        echo "   ⚠️  Session file may be invalid"
        SESSION_MISSING=1
    fi
fi

echo ""
echo "5️⃣  Testing API directly (if session exists)..."
if [ "$SESSION_MISSING" != "1" ]; then
    node -e "const { getEarnings } = require('./api'); getEarnings().then(d => { if(d.errno === 0 && d.result) { console.log('✅ API Test SUCCESS'); console.log('   Power:', Math.round((d.result.power || 0) * 1000), 'Watt'); console.log('   Yield:', d.result.today?.generation || 0, 'kWh'); } else { console.log('❌ API Test FAILED - Error:', d.errno); } }).catch(e => console.error('❌ API Test Exception:', e.message))" 2>&1 | tail -5
else
    echo "   ⏭️  Skipped (session file missing)"
fi

echo ""
echo "6️⃣  Restarting PM2 service..."
pm2 restart waaree-api || pm2 start server.js --name waaree-api

echo ""
echo "7️⃣  Waiting for server to start..."
sleep 5

echo ""
echo "8️⃣  Testing endpoints..."
echo "   Root endpoint:"
curl -s http://localhost:8888 | python3 -m json.tool 2>/dev/null | head -5 || echo "   ⚠️  Failed to get response"
echo ""
echo "   Combined endpoint:"
curl -s http://localhost:8888/combined | python3 -m json.tool 2>/dev/null | head -10 || echo "   ⚠️  Failed to get response"

echo ""
echo "================================"
if [ "$SESSION_MISSING" = "1" ]; then
    echo "⚠️  ACTION REQUIRED:"
    echo "   Run: npm run login"
    echo "   Or copy waaree-state.json from local machine"
    echo ""
fi
echo "✅ Fix script complete!"
echo "📊 Check PM2 logs: pm2 logs waaree-api --lines 50"

