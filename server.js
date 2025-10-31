// Waaree Earnings API - Filtered Endpoint
const express = require('express');
const { getEarnings } = require('./api');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());

// Filtered endpoint - returns only power and today's generation in custom format
app.get('/', async (req, res) => {
  try {
    const deviceId = req.query.deviceID || req.query.deviceId || '3996d92f-b4e5-490a-b37e-3a617d48077c';
    const data = await getEarnings(deviceId);
    
    if (data.errno !== 0 || !data.result) {
      return res.status(500).json({
        errno: 1,
        error: data.error || 'Failed to fetch data',
        message: 'Run "npm run login" first if session expired.'
      });
    }
    
    // Extract and format data
    const powerKW = data.result.power || 0;
    const generationKWh = data.result.today?.generation || 0;
    
    // Convert kW to Watts
    const powerWatts = Math.round(powerKW * 1000);
    
    // Format generation (round to 1 decimal)
    const yieldToday = parseFloat(generationKWh.toFixed(1));
    
    // Create response in requested format
    const response = {
      powerOutput: `${powerWatts} Watt`,
      yieldToday: `${yieldToday}kWh`,
      spoken: `Power output is ${powerWatts} Watt. Yield today is ${yieldToday}kWh.`
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      errno: 1,
      error: error.message,
      message: 'Failed to fetch earnings. Run "npm run login" first.'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Access at: http://0.0.0.0:${PORT} or http://YOUR_PUBLIC_IP:${PORT}`);
});

