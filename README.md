# Waaree Earnings API

Simple API endpoint that returns filtered solar earnings data.

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
  "spoken": "Solax Solar power output is 832 Watt. Yield today is 2kWh. Waaree Solar power output is 1854 Watt. Yield today is 4.9kWh. Total power output is 2686 Watt. Total yield today is 6.9kWh."
}
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Login (One-time)
```bash
npm run login
```
Enter credentials when browser opens.

### 3. Start Server
```bash
npm start
```

### 4. Visit Endpoints
```
# Waaree Solar only
http://localhost:8888

# Combined Solar Systems (Solax + Waaree)
http://localhost:8888/combined
```

## Deploy to Cloud

See `DEPLOY.md` for Render.com deployment guide.

## Files

- `server.js` - API server (filtered endpoint)
- `api.js` - Core earnings function
- `scripts/` - Login and fetching scripts

## Custom Device ID

```
http://localhost:3000?deviceID=your-device-id
```
