// Ultra-lightweight API wrapper - uses Playwright APIRequestContext instead of browser
// This uses ~10-20MB instead of ~200-400MB for full Chromium
const { request } = require('playwright');
const fs = require('fs');
require('dotenv').config();

function normalize(raw) {
  const r = raw && raw.result ? raw.result : {};
  return {
    errno: 0,
    result: {
      currency: r.currency ?? 'INR(₹)',
      power: r.power ?? 0,
      today: r.today ?? { generation: 0, earnings: 0 },
      month: r.month ?? { generation: 0, earnings: 0 },
      year: r.year ?? { generation: 0, earnings: 0 },
      cumulate: r.cumulate ?? { generation: 0, earnings: 0 },
      systemCapacity: r.systemCapacity ?? 0,
    },
  };
}

/**
 * Get earnings data using lightweight APIRequestContext (no browser launch)
 * This uses ~10-20MB RAM instead of ~200-400MB for full Chromium
 * @param {string} deviceId - Device ID
 * @param {string} storagePath - Path to storage state file (default: 'waaree-state.json')
 * @returns {Promise<Object>} Normalized earnings data
 */
async function getEarnings(deviceId = '3996d92f-b4e5-490a-b37e-3a617d48077c', storagePath = 'waaree-state.json') {
  const startTime = Date.now();
  
  // Verify storage state exists
  if (!fs.existsSync(storagePath)) {
    throw new Error('Storage state file not found. Please run npm run login first.');
  }

  let storageState;
  try {
    storageState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
  } catch (e) {
    throw new Error(`Failed to parse storage state: ${e.message}`);
  }

  // Check if we have valid session data
  const hasCookies = storageState.cookies && storageState.cookies.length > 0;
  const hasLocalStorage = storageState.origins && storageState.origins.some(o => 
    o.localStorage && o.localStorage.length > 0
  );

  if (!hasCookies && !hasLocalStorage) {
    throw new Error('Storage state appears empty. Please run npm run login again.');
  }

  // Extract token from localStorage if available (APIRequestContext may not handle localStorage automatically)
  let token = null;
  if (hasLocalStorage) {
    const origin = storageState.origins.find(o => o.localStorage && o.localStorage.length > 0);
    if (origin) {
      const tokenItem = origin.localStorage.find(item => item.name === 'token');
      if (tokenItem) {
        token = tokenItem.value;
        console.log('🔑 Found token in localStorage');
      }
    }
  }

  console.log('🔧 Using lightweight APIRequestContext (no browser)');
  console.log(`📂 Loaded session: ${hasCookies ? storageState.cookies.length + ' cookies' : ''} ${hasLocalStorage ? 'localStorage' : ''}`);

  // Build headers
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://digital.waaree.com/',
    'Origin': 'https://digital.waaree.com'
  };

  // Add token as header if available (some APIs require this)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // Some APIs also use custom token headers
    headers['X-Token'] = token;
  }

  // Create APIRequestContext with storage state (no browser launch!)
  // This is the key difference - we're using Playwright's HTTP client, not a browser
  // Memory usage: ~10-20MB instead of ~200-400MB for full Chromium
  const requestContext = await request.newContext({
    storageState: storagePath,
    // Set user agent to match browser
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    extraHTTPHeaders: headers
  });

  try {
    // Make direct API call - no browser, no page navigation, just HTTP request
    const apiUrl = `https://digital.waaree.com/c/v0/device/earnings?deviceID=${deviceId}`;
    console.log('🌐 Making direct API request (lightweight, no browser)...');
    
    const response = await requestContext.get(apiUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const status = response.status();
    console.log(`📡 API Response Status: ${status}`);

    if (status === 401 || status === 403) {
      await requestContext.dispose();
      throw new Error(`Session expired (HTTP ${status}). Please run npm run login`);
    }

    if (status !== 200) {
      const text = await response.text();
      console.error(`❌ API returned status ${status}:`, text.substring(0, 200));
      await requestContext.dispose();
      throw new Error(`API request failed with status ${status}`);
    }

    const json = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ API call completed in ${duration}s (lightweight mode)`);
    console.log(`📥 Response errno: ${json?.errno ?? 'N/A'}`);

    // Check for API-level errors
    if (json.errno !== 0 && json.errno !== undefined) {
      console.error('❌ API returned error:', json.errno, json.error || json.message);
      
      // Check if it's an authentication error
      if (json.errno === 41809 || json.errno === 401 || json.errno === 403) {
        await requestContext.dispose();
        throw new Error('Session expired - authentication required. Please run npm run login');
      }
      
      // Return error response so caller can handle it
      await requestContext.dispose();
      return json;
    }

    await requestContext.dispose();

    if (!json || !json.result) {
      throw new Error('Invalid API response structure');
    }

    return normalize(json);
  } catch (error) {
    await requestContext.dispose();
    
    // Provide helpful error messages
    if (error.message.includes('Session expired') || error.message.includes('authentication')) {
      throw error;
    }
    
    if (error.message.includes('timeout')) {
      throw new Error('API request timeout - server may be slow or unreachable');
    }
    
    throw new Error(`API request failed: ${error.message}`);
  }
}

// Export for use as module
module.exports = { getEarnings, normalize };

// If run directly, execute
if (require.main === module) {
  const deviceId = process.env.WAAREE_DEVICE_ID || '3996d92f-b4e5-490a-b37e-3a617d48077c';
  const storagePath = process.env.WAAREE_STORAGE || 'waaree-state.json';
  
  getEarnings(deviceId, storagePath)
    .then(result => {
      console.log('\n✅ Success!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error:', err.message);
      process.exit(1);
    });
}

