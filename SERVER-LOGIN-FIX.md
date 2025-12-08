# 🔧 Fix Server Login - Missing Dependencies

## Error
```
Host system is missing dependencies to run browsers.
```

## ✅ Solution

### Step 1: Install System Dependencies

Run this on your server:

```bash
# Install Playwright system dependencies
sudo npx playwright install-deps
```

This will install all required system libraries for Chromium to run.

### Step 2: Install Xvfb (for headless login)

Since the server doesn't have a display, you'll need Xvfb (virtual display):

```bash
# Install Xvfb
sudo apt-get update
sudo apt-get install -y xvfb

# Or on newer Ubuntu:
sudo apt-get install -y xvfb x11-utils
```

### Step 3: Run Login with Virtual Display

```bash
# Run login with virtual display
xvfb-run -a npm run login
```

This will run the login in a virtual display (headless).

### Step 4: Verify Session File

```bash
# Check if session file was created
ls -la waaree-state.json

# Check if it has data
cat waaree-state.json | head -20
```

Should show cookies or localStorage data.

### Step 5: Restart Server

```bash
pm2 restart waaree-api
```

### Step 6: Test

```bash
curl http://localhost:8888/combined
```

## Alternative: Copy Session from Local

If login still doesn't work on server, copy from local:

```bash
# From your LOCAL machine:
scp waaree-state.json ubuntu@144.24.114.26:~/waaree-api/

# Then on server:
cd ~/waaree-api
chmod 644 waaree-state.json
pm2 restart waaree-api
```

## Quick One-Liner

```bash
sudo npx playwright install-deps && sudo apt-get install -y xvfb && xvfb-run -a npm run login
```

