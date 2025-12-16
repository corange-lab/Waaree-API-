# Alternative Approach: Scrape on Different Machine

Since Chromium can't run on the 1GB server, here's an alternative:

## Option 1: Scrape on Local Mac, Push to Server

### Setup on Your Mac:

1. Keep the scraping code running on your Mac
2. Create a simple script that:
   - Fetches Waaree data
   - Posts it to your server via API
   - Server just serves cached data

### Implementation:

**On your Mac** - Create `push-to-server.js`:
```javascript
const { getEarnings } = require('./api');
const axios = require('axios');

async function pushToServer() {
  try {
    const data = await getEarnings();
    if (data.errno === 0) {
      const powerKW = data.result.power || 0;
      const gen = data.result.today?.generation || 0;
      
      const payload = {
        powerOutput: `${Math.round(powerKW * 1000)} Watt`,
        yieldToday: `${parseFloat(gen.toFixed(1))}kWh`,
        spoken: `Power output is ${Math.round(powerKW * 1000)} Watt. Yield today is ${parseFloat(gen.toFixed(1))}kWh.`
      };
      
      // Push to server
      await axios.post('http://144.24.114.26:8888/update-cache', payload);
      console.log('✅ Data pushed to server');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Run every 5 minutes
setInterval(pushToServer, 5 * 60 * 1000);
pushToServer();
```

**On Server** - Add endpoint to receive data:
```javascript
// In server.js
app.post('/update-cache', express.json(), (req, res) => {
  const { setCachedData } = require('./cache');
  setCachedData(req.body);
  res.json({ success: true });
});
```

## Option 2: Use Puppeteer with Minimal Chrome

Puppeteer might use less memory than Playwright. But still needs ~200MB.

## Option 3: Use curl/wget with session cookies

If Waaree API accepts direct HTTP requests with cookies, we could use curl instead of browser.

