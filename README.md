# Waaree Earnings API

Simple API endpoint that returns filtered solar earnings data from Waaree Solar system.

## Features

✅ **Lightweight**: Uses Playwright APIRequestContext (~10-20MB RAM) instead of full Chromium browser (~200-400MB RAM)  
✅ **Fast**: Direct API calls with cached responses  
✅ **Reliable**: Auto-retry with session management  
✅ **Combined Data**: Supports both Waaree and Solax solar systems  

## Endpoints

### 1. Waaree Solar Only (`/`)
Returns data from Waaree Solar system only.

**Response Format:**
```json
{
  "powerOutput": "162 Watt",
  "yieldToday": "0.4kWh",
  "spoken": "Power output is 162 Watt. Yield today is 0.4kWh."
}
```

### 2. Combined Solar Systems (`/combined`)
Returns data from both Solax Solar and Waaree Solar systems, plus totals.

**Response Format:**
```json
{
  "solax": {
    "powerOutput": "832 Watt",
    "yieldToday": "2kWh"
  },
  "waaree": {
    "powerOutput": "1854 Watt",
    "yieldToday": "4.9kWh"
  },
  "total": {
    "powerOutput": "2686 Watt",
    "yieldToday": "6.9kWh"
  },
  "spoken": "",
  "notify": "Solax 832 Watt, 2kWh. Waaree 1854 Watt, 4.9kWh. Total 6.9kWh."
}
```

**Note**: The `spoken` field is only populated when either system has 0 power output (for Siri voice feedback). The `notify` field always contains text (for notifications).

### 3. Force Refresh (`/?refresh=true`)
Forces a fresh data fetch instead of returning cached data.

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Login (One-time Setup)
```bash
npm run login
```
This will:
- Open a browser (headless mode)
- Navigate to Waaree login page
- Automatically fill credentials
- Wait for successful login
- Save session to `waaree-state.json`

**Note**: Session may take up to 15-20 seconds to fully establish. If you get a 403 error, wait a few seconds and try again, or run `npm run login` again.

### 3. Test the Session (Optional)
```bash
npm run test
```
This will verify that your session is valid and can fetch data successfully.

### 4. Start Server
```bash
npm start
```

### 5. Visit Endpoints
```
# Waaree Solar only
http://localhost:8888

# Combined Solar Systems (Solax + Waaree)
http://localhost:8888/combined

# Force refresh
http://localhost:8888?refresh=true
```

## Project Structure

- `server.js` - Express API server with caching
- `cache.js` - Cache management and auto-refresh system
- `api-lightweight.js` - Lightweight API using Playwright's HTTP client (10-20MB RAM)
- `api.js` - Full browser-based API (fallback, 200-400MB RAM)
- `autoLogin.js` - Automated login script
- `scripts/saveStorage.js` - Interactive login script (used by `npm run login`)
- `scripts/getEarnings.js` - Standalone earnings fetcher
- `test-login.js` - Session validation test script

## Environment Variables

Create a `.env` file for custom configuration:

```bash
# Waaree Credentials (optional, defaults to embedded values)
WAAREE_USERNAME=your-username
WAAREE_PASSWORD=your-password
WAAREE_DEVICE_ID=your-device-id

# Storage Path (optional)
WAAREE_STORAGE=waaree-state.json

# Server Port (optional)
PORT=8888
```

## Troubleshooting

### Login Issues

**Problem**: API returns 403 Forbidden after login

**Solution**: The session takes time to establish. Either:
1. Wait 10-15 seconds after login completes
2. Run `npm run login` again
3. Run `npm run test` to verify session

**Problem**: "Session expired" error

**Solution**: Re-run the login:
```bash
npm run login
```

### Server Issues

**Problem**: Out of memory on server

**Solution**: The system automatically uses lightweight API mode (10-20MB instead of 200-400MB). If login fails on server, login on your Mac and copy the session file:
```bash
# On Mac (after npm run login)
scp waaree-state.json ubuntu@YOUR_SERVER:~/Waaree-API-/

# On server
npm start
```

## How It Works

1. **Login Phase**: 
   - Uses Playwright to automate browser login
   - Saves cookies and localStorage to `waaree-state.json`
   - Session persists across restarts

2. **Data Fetching**:
   - Uses lightweight Playwright APIRequestContext (no browser launch)
   - Makes direct HTTP requests with saved session
   - Memory usage: ~10-20MB instead of ~200-400MB

3. **Caching**:
   - Data is cached for 30 minutes
   - Auto-refreshes during operating hours (7 AM - 7 PM IST)
   - Returns cached data instantly for fast responses

4. **Session Management**:
   - Auto-detects session expiration
   - Triggers re-login when needed
   - Consecutive failure tracking

## API Response Times

- **Cached**: <50ms
- **Fresh fetch**: 2-5 seconds
- **Combined endpoint**: 3-8 seconds (parallel fetching)

## License

MIT
