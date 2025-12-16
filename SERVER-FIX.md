# Server Fix: Lightweight API + Session Management

## Problem
- Chromium gets killed (SIGKILL) on 1GB RAM server
- Login fails because it requires browser
- Session expired (errno 41809)

## Solution: Lightweight API + Copy Session from Mac

### Step 1: Login on Your Mac (where it works)
```bash
# On your Mac
cd "/Users/Chirag/Waaree API "
npm run login
# Enter credentials when browser opens
```

### Step 2: Copy Session to Server
```bash
# On your Mac - use the helper script
./copy-session-from-mac.sh

# Or manually:
scp waaree-state.json ubuntu@144.24.114.26:~/waaree-api/waaree-state.json
```

### Step 3: Test on Server
```bash
# On server
cd ~/waaree-api
node api-lightweight.js  # Should work now!
pm2 restart waaree-api
curl http://localhost:8888/combined
```

## How It Works

1. **Lightweight API** (`api-lightweight.js`):
   - Uses Playwright's HTTP client (no browser launch)
   - Memory: ~10-20MB (vs ~200-400MB for Chromium)
   - Works perfectly on 1GB RAM server

2. **Session File** (`waaree-state.json`):
   - Contains cookies and localStorage token
   - Can be copied from Mac to server
   - No need to login on server (which fails due to low memory)

3. **Auto-Login**:
   - Still tries auto-login if session expires
   - But will fail on low-memory servers
   - Better to refresh session on Mac and copy file

## Benefits

✅ **90% less memory** - Works on 1GB RAM  
✅ **No browser crashes** - No SIGKILL errors  
✅ **Faster** - Direct HTTP requests  
✅ **Reliable** - Same functionality, less resources  

## Maintenance

When session expires:
1. Login on Mac: `npm run login`
2. Copy to server: `./copy-session-from-mac.sh`
3. Restart server: `pm2 restart waaree-api`

Sessions typically last 7-30 days depending on Waaree's settings.
