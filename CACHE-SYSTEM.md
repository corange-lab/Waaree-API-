# Cache System - How It Works

## ✅ Fast Response Times

The cache system auto-updates every **15 minutes** during **7 AM - 7 PM IST** hours only!

## How It Works

1. **Server starts** → Fetches data once
2. **Every 15 minutes** (during 7 AM - 7 PM IST) → Updates cache
3. **All requests** → Return cached data instantly (< 1ms response time!)

## Operating Hours

- **Active**: 7:00 AM - 7:00 PM IST
- **Inactive**: 7:00 PM - 7:00 AM IST (no updates, returns last cached data)
- **Update Interval**: 15 minutes during active hours

## Response Time

**Before**: 10-15 seconds (fetches from Waaree each time)
**After**: **< 1 second** (returns cached data instantly!)

## Cache Features

- ✅ Auto-updates every 15 minutes
- ✅ Only runs during solar hours (7 AM - 7 PM IST)
- ✅ Saves to `cache.json` file (survives server restarts)
- ✅ Instant response (< 1ms)
- ✅ If fetch fails, returns last cached data

## Cache File

- **Location**: `cache.json`
- **Format**: JSON with data and timestamp
- **Updates**: Every 15 minutes during 7 AM - 7 PM IST

## Testing

```bash
# Should respond instantly
curl http://144.24.114.26:8888

# Check server logs
pm2 logs waaree-api
```

## Manual Cache Refresh

If you need to force refresh cache:
```bash
# SSH into server
ssh -i 'key.key' ubuntu@144.24.114.26
cd ~/waaree-api
pm2 restart waaree-api
```

