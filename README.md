# Waaree Earnings API

Simple API endpoint that returns filtered solar earnings data.

## Response Format

```json
{
  "powerOutput": "162 Watt",
  "yieldToday": "0.4kWh",
  "spoken": "Power output is 162 Watt. Yield today is 0.4kWh."
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

### 4. Visit Endpoint
```
http://localhost:3000
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
