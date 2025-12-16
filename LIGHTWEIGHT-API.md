# Lightweight API Implementation

## Overview

The lightweight API (`api-lightweight.js`) uses Playwright's `APIRequestContext` instead of launching a full Chromium browser. This dramatically reduces memory usage from ~200-400MB to ~10-20MB.

## How It Works

### Traditional Approach (api.js)
- Launches full Chromium browser
- Creates browser context
- Navigates to page
- Waits for JavaScript to execute
- Intercepts API responses
- **Memory: ~200-400MB**

### Lightweight Approach (api-lightweight.js)
- Uses Playwright's HTTP client (`request.newContext()`)
- Makes direct HTTP GET request to API endpoint
- Uses storage state (cookies/localStorage) for authentication
- **Memory: ~10-20MB**

## Key Benefits

1. **90% less memory usage** - Perfect for 1GB RAM servers
2. **Faster execution** - No browser startup/navigation overhead
3. **More reliable** - No browser crashes or OOM kills
4. **Same functionality** - Uses same session/cookies as browser

## Usage

The `cache.js` automatically uses the lightweight API if available:

```javascript
// cache.js automatically loads api-lightweight.js
const { getEarnings } = require('./api-lightweight');
```

## Authentication

The lightweight API:
1. Loads `waaree-state.json` (same as browser approach)
2. Extracts cookies from storage state
3. Extracts token from localStorage (if available)
4. Makes HTTP request with cookies and token headers

## Auto-Login

Auto-login still uses the full browser (required for login flow), but after login, the lightweight API can use the saved session.

## Testing

Test locally:
```bash
node api-lightweight.js
```

Test on server:
```bash
cd ~/waaree-api
node api-lightweight.js
```

## Fallback

If `api-lightweight.js` fails or doesn't exist, `cache.js` automatically falls back to the full browser API (`api.js`).

