// Waaree Earnings API - Filtered Endpoint with Cache
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { startCacheService, getCachedData, fetchData, setCachedData } = require('./cache');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());
app.use(express.json()); // For POST requests

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
    // First check if we have cached data
    let cached = getCachedData();
    console.log('💾 Initial cached data check:', cached ? `Found - Power: ${cached.powerOutput}` : 'Not found');
    
    // Try to get fresh data (this might return undefined if already updating)
    console.log('🔄 Attempting fresh fetch...');
    try {
      const fetchResult = await fetchData();
      if (fetchResult && fetchResult.powerOutput && fetchResult.yieldToday) {
        console.log('✅ Got fresh data from fetchData()');
        return fetchResult;
      }
    } catch (fetchError) {
      console.log('⚠️ fetchData() error (may be updating):', fetchError.message);
    }
    
    // Check cache again after fetch attempt
    cached = getCachedData();
    if (cached && cached.powerOutput && cached.yieldToday) {
      console.log('✅ Using cached Waaree data');
      return cached;
    }
    
    // Fallback to localhost endpoint if cache is empty
    console.log('⚠️ Cache empty, trying localhost endpoint...');
    try {
      const response = await axios.get('http://localhost:8888', {
        timeout: 10000
      });
      if (response.data && response.data.powerOutput && response.data.yieldToday) {
        console.log('✅ Got data from localhost endpoint');
        return response.data;
      }
    } catch (localhostError) {
      console.error('❌ Localhost endpoint failed:', localhostError.message);
    }
    
    console.error('❌ All Waaree data fetch methods failed - returning null');
    return null;
  } catch (error) {
    console.error('❌ Error fetching Waaree data:', error.message);
    // Last resort: try cached data
    const cached = getCachedData();
    if (cached) {
      console.log('✅ Using cached data as last resort');
      return cached;
    }
    return null;
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

    // Debug logging
    console.log('📊 Solax data received:', solaxData ? JSON.stringify(solaxData) : 'null');
    console.log('📊 Waaree data received:', waareeData ? JSON.stringify(waareeData) : 'null');

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
    
    console.log('🔍 Extracted Waaree values - Power:', waareePower, 'Value:', waareePowerValue, 'Yield:', waareeYield, 'Value:', waareeYieldValue);

    // Calculate totals
    const totalPower = solaxPowerValue + waareePowerValue;
    const totalYield = solaxYieldValue + waareeYieldValue;

    // Check if either system has 0 power output
    const hasZeroPower = solaxPowerValue === 0 || waareePowerValue === 0;
    const spokenText = `Solax ${solaxPower}, ${solaxYield}. Waaree ${waareePower}, ${waareeYield}. Total ${parseFloat(totalYield.toFixed(1))}kWh.`;

    // Build response
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
      // If either system has 0 power: spoken has text (Siri will speak), notify has text
      // If both have power: spoken is empty (no speech), notify has text (notification only)
      spoken: hasZeroPower ? spokenText : "",
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

// Endpoint to receive data from external source (e.g., your Mac)
app.post('/update-cache', (req, res) => {
  try {
    const data = req.body;
    if (data && (data.powerOutput || data.yieldToday)) {
      setCachedData(data);
      return res.json({ 
        success: true, 
        message: 'Cache updated',
        data: data
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Invalid data format'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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

