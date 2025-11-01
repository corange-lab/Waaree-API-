// Waaree Earnings API - Filtered Endpoint with Cache
const express = require('express');
const cors = require('cors');
const { startCacheService, getCachedData } = require('./cache');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());

// Start cache service on startup
startCacheService();

// Filtered endpoint - returns cached data instantly
app.get('/', (req, res) => {
  try {
    // Return cached data (fast response!)
    const cache = getCachedData();
    
    if (cache) {
      return res.json(cache);
    }
    
    // Fallback if no cache yet
    return res.status(503).json({
      errno: 1,
      error: 'Data not available',
      message: 'Cache is being populated. Please try again in a few seconds.'
    });
  } catch (error) {
    res.status(500).json({
      errno: 1,
      error: error.message,
      message: 'Failed to fetch earnings.'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Access at: http://0.0.0.0:${PORT} or http://YOUR_PUBLIC_IP:${PORT}`);
});

