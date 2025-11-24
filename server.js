// Waaree Earnings API - Filtered Endpoint with Cache
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { startCacheService, getCachedData, fetchData } = require('./cache');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());

// Start cache service on startup
startCacheService();

// Function to fetch Solax data
async function fetchSolaxData() {
  try {
    const response = await axios.get('https://officialmobileunlocking.com/solar/solax_combined.php?user=km_patel', {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Solax data:', error.message);
    return null;
  }
}

// Function to fetch Waaree data - always gets fresh data for combined endpoint
async function fetchWaareeData() {
  try {
    // Force fresh fetch instead of using cached endpoint
    await fetchData();
    const freshData = getCachedData();
    if (freshData) {
      return freshData;
    }
    // Fallback to cached endpoint if fresh fetch fails
    const response = await axios.get('http://localhost:8888', {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Waaree data:', error.message);
    // Last resort: try cached data
    const cached = getCachedData();
    return cached || null;
  }
}

// Function to extract numeric value from string (e.g., "832 Watt" -> 832, "2kWh" -> 2, "1,932W" -> 1932)
function extractNumericValue(str) {
  if (!str) return 0;
  // Remove commas and extract all numbers and decimals
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Combined endpoint - fetches data from both systems
app.get('/combined', async (req, res) => {
  try {
    // Fetch data from both systems in parallel
    const [solaxData, waareeData] = await Promise.all([
      fetchSolaxData(),
      fetchWaareeData()
    ]);

    // Extract values from Solax
    const solaxPower = solaxData?.powerOutput || '0 Watt';
    const solaxYield = solaxData?.yieldToday || '0kWh';
    const solaxPowerValue = extractNumericValue(solaxPower);
    const solaxYieldValue = extractNumericValue(solaxYield);

    // Extract values from Waaree
    const waareePower = waareeData?.powerOutput || '0 Watt';
    const waareeYield = waareeData?.yieldToday || '0kWh';
    const waareePowerValue = extractNumericValue(waareePower);
    const waareeYieldValue = extractNumericValue(waareeYield);

    // Calculate totals
    const totalPower = solaxPowerValue + waareePowerValue;
    const totalYield = solaxYieldValue + waareeYieldValue;

    // Build response - keep old format with spoken always present, add notify field
    const spokenText = `Solax ${solaxPower}, ${solaxYield}. Waaree ${waareePower}, ${waareeYield}. Total ${parseFloat(totalYield.toFixed(1))}kWh.`;

    const response = {
      solax: {
        powerOutput: solaxPower,
        yieldToday: solaxYield
      },
      waaree: {
        powerOutput: waareePower,
        yieldToday: waareeYield
      },
      total: {
        powerOutput: `${Math.round(totalPower)} Watt`,
        yieldToday: `${parseFloat(totalYield.toFixed(1))}kWh`
      },
      spoken: spokenText,
      notify: spokenText
    };

    return res.json(response);
  } catch (error) {
    res.status(500).json({
      errno: 1,
      error: error.message,
      message: 'Failed to fetch combined solar data.'
    });
  }
});

// Filtered endpoint - returns cached data instantly, with optional refresh
app.get('/', async (req, res) => {
  try {
    // Force refresh if ?refresh=true is passed
    if (req.query.refresh === 'true') {
      console.log('Force refresh requested...');
      await fetchData().catch(console.error);
    }
    
    // Return cached data (fast response!)
    const cache = getCachedData();
    
    if (cache) {
      return res.json(cache);
    }
    
    // Fallback if no cache yet - try to fetch once
    console.log('No cache available, fetching fresh data...');
    try {
      await fetchData();
      const freshCache = getCachedData();
      if (freshCache) {
        return res.json(freshCache);
      }
    } catch (e) {
      console.error('Failed to fetch fresh data:', e.message);
    }
    
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

