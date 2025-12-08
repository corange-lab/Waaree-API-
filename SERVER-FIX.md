# 🔧 Server Fix Guide - Waaree API Not Working

## Problem
API works locally but returns 0 or errors on server. This is usually because:
1. Session file (`waaree-state.json`) doesn't exist or is empty on server
2. Playwright browsers not installed on server
3. Login hasn't been run on server

## ✅ Complete Server Setup Steps

### Step 1: SSH into Server
```bash
ssh root@144.24.114.26
# or
ssh your-username@144.24.114.26
```

### Step 2: Navigate to App Directory
```bash
cd ~/waaree-api
# or wherever your app is located
```

### Step 3: Pull Latest Code
```bash
git pull origin main
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Install Playwright Browsers (CRITICAL!)
```bash
# This installs Chromium browser needed for API calls
npx playwright install chromium

# Verify installation
npx playwright install-deps chromium
```

### Step 6: Run Login to Create Session (CRITICAL!)
```bash
# This will open a browser (if X11 forwarding) or run headless
# For headless server, you may need to use Xvfb or run with display
npm run login

# If headless login fails, you can use Xvfb (virtual display):
# Install Xvfb first: apt-get install xvfb (on Ubuntu/Debian)
# Then run: xvfb-run -a npm run login
```

**Alternative: Manual Login with X11 Forwarding**
```bash
# From your local machine, SSH with X11 forwarding:
ssh -X root@144.24.114.26

# Then on server:
cd ~/waaree-api
npm run login
# Browser will open on your local machine
```

**Alternative: Copy Session from Local (if same credentials)**
```bash
# On your local machine:
scp waaree-state.json root@144.24.114.26:~/waaree-api/

# Then verify on server:
cd ~/waaree-api
ls -la waaree-state.json
cat waaree-state.json | head -20
```

### Step 7: Verify Session File Exists
```bash
# Check if session file exists and has data
ls -la waaree-state.json
cat waaree-state.json | python3 -m json.tool | head -30

# Should show cookies or localStorage data
# If empty or missing, login didn't work
```

### Step 8: Test API Locally on Server
```bash
# Test the API directly
node -e "const { getEarnings } = require('./api'); getEarnings().then(d => console.log(JSON.stringify(d, null, 2))).catch(e => console.error('Error:', e.message))"

# Should return data, not error 41809 or 403
```

### Step 9: Restart PM2 Service
```bash
# Stop current service
pm2 stop waaree-api

# Start fresh
pm2 start server.js --name waaree-api

# Or restart
pm2 restart waaree-api

# Check status
pm2 status

# View logs
pm2 logs waaree-api --lines 50
```

### Step 10: Test Endpoints
```bash
# Test locally on server
curl http://localhost:8888
curl http://localhost:8888/combined

# Should return Waaree data, not 0
```

## 🔍 Troubleshooting

### Issue: Login Script Fails on Server
**Solution**: Use Xvfb for headless display
```bash
# Install Xvfb
apt-get update
apt-get install -y xvfb

# Run login with virtual display
xvfb-run -a npm run login
```

### Issue: waaree-state.json is Empty
**Solution**: 
1. Check if login actually completed
2. Verify credentials are correct
3. Try manual login with browser
4. Check file permissions: `chmod 644 waaree-state.json`

### Issue: Playwright Browser Not Found
**Solution**:
```bash
# Reinstall browsers
npx playwright install chromium --force

# Install system dependencies (Ubuntu/Debian)
npx playwright install-deps chromium
```

### Issue: Permission Denied
**Solution**:
```bash
# Fix file permissions
chmod 644 waaree-state.json
chown $USER:$USER waaree-state.json

# Check PM2 user
pm2 list
# If running as different user, fix ownership
```

### Issue: API Returns Error 41809 or 403
**Solution**: Session expired or invalid
1. Delete old session: `rm waaree-state.json`
2. Run login again: `npm run login`
3. Verify session file has data
4. Restart server: `pm2 restart waaree-api`

### Issue: API Returns 0 Power
**Solution**: Check logs for errors
```bash
pm2 logs waaree-api --lines 100

# Look for:
# - "Session expired" messages
# - "Failed to retrieve earnings data"
# - Error codes 41809, 403, etc.
```

## 📋 Quick Checklist

- [ ] Code pulled from GitHub (`git pull`)
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright browsers installed (`npx playwright install chromium`)
- [ ] Session file exists (`ls waaree-state.json`)
- [ ] Session file has data (not empty)
- [ ] Login completed successfully
- [ ] PM2 service restarted
- [ ] Test endpoint returns data (not 0)

## 🚀 Quick Fix Script

Save this as `fix-server.sh` and run on server:

```bash
#!/bin/bash
cd ~/waaree-api
echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
npm install

echo "3. Installing Playwright browsers..."
npx playwright install chromium

echo "4. Checking session file..."
if [ ! -f "waaree-state.json" ] || [ ! -s "waaree-state.json" ]; then
    echo "   Session file missing or empty. Running login..."
    echo "   NOTE: You may need Xvfb or X11 forwarding for this"
    npm run login
else
    echo "   Session file exists"
fi

echo "5. Restarting PM2 service..."
pm2 restart waaree-api

echo "6. Testing endpoint..."
sleep 3
curl -s http://localhost:8888 | python3 -m json.tool

echo ""
echo "✅ Setup complete! Check output above for Waaree data."
```

## 📞 Still Not Working?

Check PM2 logs:
```bash
pm2 logs waaree-api --lines 100 --nostream
```

Look for specific error messages and share them for further troubleshooting.

