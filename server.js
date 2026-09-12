// Waaree Earnings API - Filtered Endpoint with Cache
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { startCacheService, getCachedData, fetchData, setCachedData, recordSnapshot } = require('./cache');
const db = require('./data/database');

const app = express();
const PORT = process.env.PORT || 8888;
const SOLAX_API_URL = process.env.SOLAX_API_URL || 'https://officialmobileunlocking.com/solar/solax_combined.php?user=km_patel';

app.use(cors());
app.use(express.json()); // For POST requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve dashboard frontend

// Start cache service on startup
startCacheService();

// Function to fetch Solax data
async function fetchSolaxData() {
  try {
    const response = await axios.get(SOLAX_API_URL, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Solax data:', error.message);
    return null;
  }
}

// Function to fetch Waaree data - uses cache by default for speed and stability
async function fetchWaareeData(forceRefresh = false) {
  try {
    let cached = getCachedData();
    if (cached && !forceRefresh) {
      return cached;
    }

    // If forced refresh or no cache, attempt fresh fetch
    console.log('🔄 Attempting fresh fetch (force:', forceRefresh, ')...');
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
      const response = await axios.get(`http://localhost:${PORT}`, {
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
    const cached = getCachedData();
    if (cached) return cached;
    return null;
  }
}

// Function to extract numeric value from string (e.g., "832 Watt" -> 832, "2kWh" -> 2, "1,932W" -> 1932)
function extractNumericValue(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/,/g, '');
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Combined endpoint - fetches data from both systems
app.get('/combined', async (req, res) => {
  try {
    const force = req.query.refresh === 'true';

    // Fetch data from both systems in parallel
    const [solaxData, waareeData] = await Promise.all([
      fetchSolaxData(),
      fetchWaareeData(force)
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

    // Check if either system has 0 power output
    const hasZeroPower = solaxPowerValue === 0 || waareePowerValue === 0;
    const spokenText = `Solax ${solaxPower}, ${solaxYield}. Waaree ${waareePower}, ${waareeYield}. Total ${parseFloat(totalYield.toFixed(1))}kWh.`;

    // Record snapshot to database asynchronously
    if (waareePowerValue > 0 || solaxPowerValue > 0 || waareeYieldValue > 0 || solaxYieldValue > 0) {
      db.recordReading({
        waareePower,
        waareeYield,
        solaxPower,
        solaxYield,
        timestamp: new Date()
      });
    }

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

// ==========================================
// SOLAR HISTORY & ANALYTICS API ENDPOINTS
// ==========================================

// Dashboard Web Interface
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Latest real-time status with totals
app.get('/api/latest', async (req, res) => {
  try {
    const waaree = getCachedData() || { powerOutput: '0 Watt', yieldToday: '0kWh' };
    let solax = null;
    try {
      solax = await fetchSolaxData();
    } catch (e) {}

    const solaxPowerVal = extractNumericValue(solax?.powerOutput);
    const solaxYieldVal = extractNumericValue(solax?.yieldToday);
    const waareePowerVal = extractNumericValue(waaree?.powerOutput);
    const waareeYieldVal = extractNumericValue(waaree?.yieldToday);

    const totalPower = solaxPowerVal + waareePowerVal;
    const totalYield = solaxYieldVal + waareeYieldVal;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      waaree: {
        powerOutput: waaree.powerOutput,
        yieldToday: waaree.yieldToday,
        powerValue: waareePowerVal,
        yieldValue: waareeYieldVal
      },
      solax: {
        powerOutput: solax?.powerOutput || '0 Watt',
        yieldToday: solax?.yieldToday || '0kWh',
        powerValue: solaxPowerVal,
        yieldValue: solaxYieldVal
      },
      total: {
        powerOutput: `${Math.round(totalPower)} Watt`,
        yieldToday: `${parseFloat(totalYield.toFixed(1))}kWh`,
        powerValue: Math.round(totalPower),
        yieldValue: parseFloat(totalYield.toFixed(1))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Daily history endpoint (up to 180 days / 6 months)
app.get('/api/history', (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const summaries = db.getDailySummaries({ range, fromDate: from, toDate: to });
    res.json({
      success: true,
      count: summaries.length,
      range,
      data: summaries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Intraday 15-minute readings for a specific date
app.get('/api/intraday', (req, res) => {
  try {
    const targetDate = req.query.date || db.formatISTDate(new Date());
    const readings = db.getIntradayReadings(targetDate);
    res.json({
      success: true,
      date: targetDate,
      count: readings.length,
      data: readings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6-month analytics, totals, best days, monthly breakdown
app.get('/api/analytics', (req, res) => {
  try {
    const analytics = db.getAnalytics();
    res.json({
      success: true,
      analytics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export historical data to CSV or JSON
app.get('/api/export', (req, res) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const data = db.exportData(format);
    const dateStr = db.formatISTDate(new Date());

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="solar-history-${dateStr}.json"`);
      return res.send(data);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="solar-history-${dateStr}.csv"`);
    return res.send(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual snapshot trigger / sync endpoint
app.post('/api/sync', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const solax = await fetchSolaxData();
    let waaree = getCachedData();

    if (!waaree || force) {
      try {
        waaree = await fetchData();
      } catch (e) {}
    }

    const reading = await recordSnapshot(solax);
    res.json({
      success: true,
      message: 'Solar snapshot successfully recorded into database',
      reading
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Public access: http://80.225.207.88:${PORT}`);
  console.log(`\n📍 Available endpoints:`);
  console.log(`   Dashboard:   http://80.225.207.88:${PORT}/dashboard`);
  console.log(`   Analytics:   http://80.225.207.88:${PORT}/api/analytics`);
  console.log(`   History:     http://80.225.207.88:${PORT}/api/history?range=30d`);
  console.log(`   Intraday:    http://80.225.207.88:${PORT}/api/intraday`);
  console.log(`   Export:      http://80.225.207.88:${PORT}/api/export?format=csv`);
  console.log(`   Waaree only: http://80.225.207.88:${PORT}/`);
  console.log(`   Combined:    http://80.225.207.88:${PORT}/combined`);
});

