const { getEarnings } = require('./api');
const { autoLogin } = require('./autoLogin');
const fs = require('fs');

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

// Check if current time is within 7 AM - 7 PM IST
function isWithinOperatingHours() {
  const now = new Date();
  const utcTime = now.getTime();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(utcTime + istOffset);
  const hours = istTime.getUTCHours();
  
  // 7 AM = 1:30 UTC, 7 PM = 13:30 UTC (approx)
  return hours >= 1 && hours < 13;
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
      consecutiveFailures = 0; // Reset failure counter on success
      
      console.log('✅ Data cached:', response.powerOutput);
      return response;
    }
    
    throw new Error('Failed to fetch data');
  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
    consecutiveFailures++;
    
    // Auto-login if we have too many failures (likely session expired)
    if (consecutiveFailures >= 2) {
      console.log('Session likely expired, attempting auto-login...');
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

// Initialize cache system
function startCacheService() {
  loadCache();
  
  // Initial fetch
  if (isWithinOperatingHours()) {
    fetchData().catch(console.error);
  }
  
  // Schedule updates every 30 minutes
  setInterval(async () => {
    if (isWithinOperatingHours()) {
      await fetchData().catch(console.error);
    } else {
      console.log('Outside operating hours (7 AM - 7 PM IST), skipping fetch');
    }
  }, 30 * 60 * 1000); // 30 minutes
  
  console.log('⚡ Cache service started. Updates every 30 minutes (7 AM - 7 PM IST)');
}

// Get cached data
function getCachedData() {
  return cachedData;
}

module.exports = { 
  startCacheService, 
  getCachedData, 
  isWithinOperatingHours,
  fetchData
};
