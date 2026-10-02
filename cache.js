// Use full browser API for Waaree authentication compatibility
// The lightweight API doesn't work with Waaree's session management (errno 41809)
// Memory usage: ~200-400MB but necessary for proper authentication
require('dotenv').config();
const { getEarnings } = require('./api');
console.log('🔧 Using full browser API (~200-400MB RAM, required for Waaree auth)');
const { autoLogin } = require('./autoLogin');
const fs = require('fs');
const axios = require('axios');
const db = require('./data/database');

const SOLAX_API_URL = process.env.SOLAX_API_URL || 'https://officialmobileunlocking.com/solar/solax_combined.php?user=km_patel';

let cachedData = null;
let cacheTime = null;
let isUpdating = false;
let consecutiveFailures = 0;

// Load cache on startup
function loadCache() {
  try {
    if (fs.existsSync('./cache.json')) {
      const cache = JSON.parse(fs.readFileSync('./cache.json', 'utf-8'));
      cachedData = cache.data;
      cacheTime = cache.time;
      console.log('✅ Cache loaded from file');
    }
  } catch (e) {
    console.log('No cache file found');
  }
}

// Save cache to file
function saveCache() {
  try {
    fs.writeFileSync('./cache.json', JSON.stringify({
      data: cachedData,
      time: cacheTime
    }, null, 2));
  } catch (e) {
    console.error('Failed to save cache:', e.message);
  }
}

// Check if current time is within 6 AM - 7 PM IST
function isWithinOperatingHours() {
  const now = new Date();
  const istHourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false
  }).format(now);
  const istHour = parseInt(istHourStr, 10);
  return istHour >= 6 && istHour <= 19;
}

// Fetch fresh data
async function fetchData() {
  if (isUpdating) {
    console.log('Already updating, skipping...');
    return;
  }
  
  isUpdating = true;
  
  try {
    console.log('Fetching fresh data...');
    const data = await getEarnings();
    
    console.log('📥 Raw API response errno:', data?.errno);
    console.log('📥 Raw API response result:', data?.result ? 'Present' : 'Missing');
    
    // Check for authentication/session errors (common error codes: 41809, 401, etc.)
    if (data.errno && data.errno !== 0) {
      console.error('❌ API returned error code:', data.errno);
      if (data.errno === 41809 || data.errno === 401 || data.errno === 403) {
        console.log('🔐 Detected authentication error, triggering auto-login immediately...');
        consecutiveFailures = 2; // Force auto-login immediately
        throw new Error('Session expired - authentication required');
      }
      // For other errors, throw to trigger normal error handling
      throw new Error(`API error: ${data.errno}`);
    }
    
    if (data.errno === 0 && data.result) {
      const powerKW = data.result.power || 0;
      const generationKWh = data.result.today?.generation || 0;
      
      console.log('🔍 Extracted values - Power (KW):', powerKW, 'Generation (kWh):', generationKWh);
      
      // Check if we have valid data
      if (powerKW === 0 && generationKWh === 0) {
        console.warn('⚠️ API returned zero values - this might be correct if system is off');
      }
      
      const response = {
        powerOutput: `${Math.round(powerKW * 1000)} Watt`,
        yieldToday: `${parseFloat(generationKWh.toFixed(1))}kWh`,
        spoken: `Power output is ${Math.round(powerKW * 1000)} Watt. Yield today is ${parseFloat(generationKWh.toFixed(1))}kWh.`
      };
      
      cachedData = response;
      cacheTime = new Date().toISOString();
      saveCache();
      consecutiveFailures = 0; // Reset failure counter on success
      
      console.log('✅ Data cached:', response.powerOutput, 'Yield:', response.yieldToday);
      recordSnapshot().catch(err => console.error('Snapshot error:', err.message));
      return response;
    }
    
    console.error('❌ Invalid API response structure:', JSON.stringify(data));
    throw new Error('Failed to fetch data - invalid response structure');
  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
    consecutiveFailures++;
    
    // Auto-login if we have too many failures (likely session expired)
    // NOTE: Auto-login requires browser, which may fail on low-memory servers
    // Better to login on Mac and copy session file to server
    if (consecutiveFailures >= 2) {
      console.log('Session likely expired, attempting auto-login...');
      console.log('⚠️ Note: Auto-login requires browser. On low-memory servers,');
      console.log('   consider logging in on Mac and copying waaree-state.json to server.');
      try {
        const loginSuccess = await autoLogin();
        if (loginSuccess) {
          consecutiveFailures = 0;
          console.log('Retrying fetch after auto-login...');
          // Retry once after login
          try {
            const data = await getEarnings();
            if (data.errno === 0 && data.result) {
              const powerKW = data.result.power || 0;
              const generationKWh = data.result.today?.generation || 0;
              
              const response = {
                powerOutput: `${Math.round(powerKW * 1000)} Watt`,
                yieldToday: `${parseFloat(generationKWh.toFixed(1))}kWh`,
                spoken: `Power output is ${Math.round(powerKW * 1000)} Watt. Yield today is ${parseFloat(generationKWh.toFixed(1))}kWh.`
              };
              
              cachedData = response;
              cacheTime = new Date().toISOString();
              saveCache();
              console.log('✅ Data cached after auto-login:', response.powerOutput);
              return response;
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError.message);
          }
        }
      } catch (loginError) {
        console.error('❌ Auto-login failed (browser may be killed on low-memory server):', loginError.message);
        console.log('💡 Solution: Login on Mac and copy waaree-state.json to server');
      }
    }
    
    // Return cached data if fetch fails
    if (cachedData) {
      console.log('Returning cached data due to error');
      return cachedData;
    }
    
    throw error;
  } finally {
    isUpdating = false;
  }
}

// Record a combined snapshot to database
async function recordSnapshot(customSolaxData = null) {
  try {
    let solaxData = customSolaxData;
    if (!solaxData) {
      try {
        const resp = await axios.get(SOLAX_API_URL, { timeout: 8000 });
        solaxData = resp.data;
      } catch (err) {
        console.warn('⚠️ [Cache] Failed to fetch Solax data for snapshot:', err.message);
      }
    }

    const waareeData = getCachedData();
    if (waareeData || solaxData) {
      return db.recordReading({
        waareePower: waareeData?.powerOutput,
        waareeYield: waareeData?.yieldToday,
        solaxPower: solaxData?.powerOutput,
        solaxYield: solaxData?.yieldToday,
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error('❌ [Cache] Error recording snapshot to database:', err.message);
  }
}

// Initialize cache system
function startCacheService() {
  loadCache();
  
  // Don't fetch on startup if cache exists (prevents Chromium launch on server startup)
  // Only fetch if cache is empty
  if (!cachedData && isWithinOperatingHours()) {
    console.log('No cache found, attempting initial fetch...');
    fetchData().catch(err => {
      console.log('Initial fetch failed (may be expected on low-memory servers):', err.message);
    });
  } else if (cachedData) {
    console.log('✅ Using existing cache, skipping initial fetch');
  }
  
  // Schedule updates every 30 minutes
  setInterval(async () => {
    if (isWithinOperatingHours()) {
      await fetchData().catch(console.error);
    } else {
      console.log('Outside operating hours (7 AM - 7 PM IST), skipping fetch');
    }
  }, 30 * 60 * 1000); // 30 minutes

  // Schedule database snapshot logging every 15 minutes during operating hours
  setInterval(async () => {
    if (isWithinOperatingHours()) {
      console.log('📸 [Cache] Recording periodic 15-minute solar snapshot...');
      await recordSnapshot().catch(console.error);
    }
  }, 15 * 60 * 1000); // 15 minutes

  // Take an initial snapshot shortly after startup if data exists
  setTimeout(() => {
    recordSnapshot().catch(console.error);
  }, 5000);
  
  console.log('⚡ Cache service started. Waaree updates every 30m, snapshots recorded every 15m (7 AM - 7 PM IST)');
}

// Get cached data
function getCachedData() {
  return cachedData;
}

// Set cached data (for external updates)
function setCachedData(data) {
  cachedData = data;
  cacheTime = new Date().toISOString();
  saveCache();
  console.log('✅ Cache updated externally:', data?.powerOutput || 'N/A');
  recordSnapshot().catch(err => console.error('Snapshot error:', err.message));
}

module.exports = { 
  startCacheService, 
  getCachedData, 
  setCachedData,
  isWithinOperatingHours,
  fetchData,
  recordSnapshot
};
