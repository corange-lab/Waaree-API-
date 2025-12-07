// Simple API wrapper - pure Node.js code you can call
const { chromium } = require('playwright');
const fs = require('fs');

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
 * Get earnings data for a device
 * @param {string} deviceId - Device ID
 * @param {string} storagePath - Path to storage state file (default: 'waaree-state.json')
 * @returns {Promise<Object>} Normalized earnings data
 */
async function getEarnings(deviceId = '3996d92f-b4e5-490a-b37e-3a617d48077c', storagePath = 'waaree-state.json') {
  // Verify storage state exists and has data
  const fs = require('fs');
  if (fs.existsSync(storagePath)) {
    const state = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const hasData = (state.cookies && state.cookies.length > 0) || 
                    (state.origins && state.origins.some(o => o.localStorage && o.localStorage.length > 0));
    if (!hasData) {
      console.warn('⚠️ Storage state file exists but appears empty. Session may not work.');
    }
  } else {
    console.warn('⚠️ Storage state file not found. Login may be required.');
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  // Load storage state if it exists
  let contextOptions = {};
  if (fs.existsSync(storagePath)) {
    try {
      contextOptions = { storageState: storagePath };
      console.log('📂 Loading saved session state...');
    } catch (e) {
      console.warn('⚠️ Could not load storage state:', e.message);
    }
  }
  
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  
  // Verify we're logged in by checking current URL after a test navigation
  console.log('🔍 Verifying session...');
  try {
    await page.goto('https://digital.waaree.com', { waitUntil: 'networkidle', timeout: 15000 });
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.error('❌ Session invalid - redirected to login page');
      await browser.close();
      throw new Error('Session expired - please run npm run login');
    }
    console.log('✅ Session appears valid');
  } catch (e) {
    if (e.message.includes('Session expired')) throw e;
    console.log('⚠️ Could not verify session, continuing anyway...');
  }

  let earningsResponse = null;
  
  // Set up response listener FIRST (before navigation)
  const responsePromise = page.waitForResponse(
    (response) => {
      const url = response.url();
      return url.includes('/c/v0/device/earnings') && 
             url.includes('deviceID=') &&
             response.request().method() === 'GET';
    },
    { timeout: 30000 }
  ).then(resp => { 
    earningsResponse = resp; 
    return resp; 
  }).catch(() => null);

  // Navigate and wait for API call
  const detailUrl = `https://digital.waaree.com/bus/device/inverterDetail?id=${deviceId}&flowType=1&status=3&hasPV=true&hasBattery=false&inParallel=0&wifiMeterID=&wifiMeterSN=`;
  
  console.log('🌐 Navigating to device page...');
  // Use networkidle to ensure page is fully loaded with all resources
  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 });
  
  // Check if we got redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.error('❌ Redirected to login page - session expired');
    await browser.close();
    throw new Error('Session expired - redirected to login. Please run npm run login');
  }
  
  console.log('✅ Page loaded');
  
  // Wait for page JavaScript to initialize - the page will naturally make the API call
  console.log('⏳ Waiting for page to initialize and make API call...');
  // Wait longer for Vue/React apps to initialize
  await page.waitForTimeout(8000);
  
  // The page should automatically make the API call. Wait for it with a longer timeout
  console.log('⏳ Waiting for earnings API response (up to 15 seconds)...');
  await Promise.race([
    responsePromise,
    new Promise(resolve => setTimeout(resolve, 15000))
  ]);
  
  // If we didn't get the response yet, try triggering it manually
  if (!earningsResponse) {
    console.log('🔄 API call not detected automatically, triggering manually...');
    await page.evaluate(async (id) => {
      try {
        // Try axios first
        const axios = window.axios || (window.$ && window.$.axios);
        if (axios) {
          await axios.get('/c/v0/device/earnings', { params: { deviceID: id } }).catch(() => {});
          return;
        }
      } catch (e) {}
      
      // Fallback: try fetch
      try {
        const url = new URL('/c/v0/device/earnings', window.location.origin);
        url.searchParams.set('deviceID', id);
        await fetch(url, { credentials: 'include' }).catch(() => {});
      } catch (e) {}
    }, deviceId);
    
    // Wait a bit more for the manual trigger
    await Promise.race([
      responsePromise,
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
  }

  let json = null;
  
  // Get response if available
  if (earningsResponse) {
    try {
      json = await earningsResponse.json();
      console.log('✅ Got response from waitForResponse:', json ? 'Yes' : 'No');
    } catch (e) {
      console.log('⚠️ Error parsing response from waitForResponse:', e.message);
    }
  } else {
    console.log('⚠️ No earningsResponse from waitForResponse');
  }

  // Fallback: try direct API call in page context with better error handling
  if (!json || (json.errno !== 0 && json.errno !== undefined)) {
    console.log('🔄 Trying fallback: direct API call in page context...');
    try {
      json = await page.evaluate(async (id) => {
        // Wait a bit for any pending requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Try axios first
          const axios = window.axios || (window.$ && window.$.axios);
          if (axios) {
            const resp = await axios.get('/c/v0/device/earnings', {
              params: { deviceID: id },
              timeout: 10000
            });
            return resp.data || resp;
          }
        } catch (axiosError) {
          console.log('Axios failed, trying fetch...');
        }
        
        // Fallback: try fetch with full error handling
        try {
          const url = new URL('/c/v0/device/earnings', window.location.origin);
          url.searchParams.set('deviceID', id);
          const resp = await fetch(url, {
            credentials: 'include',
            headers: { 
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: 'GET'
          });
          
          if (!resp.ok) {
            console.log('Fetch response not OK:', resp.status, resp.statusText);
            // Try to get error message
            const text = await resp.text();
            try {
              return JSON.parse(text);
            } catch {
              return { errno: resp.status, error: text.substring(0, 100) };
            }
          }
          
          return await resp.json();
        } catch (fetchError) {
          console.error('Fetch error:', fetchError.message);
          return { errno: -1, error: fetchError.message };
        }
      }, deviceId);
      
      if (json) {
        console.log('📦 Fallback API call result:', json.errno !== undefined ? `errno: ${json.errno}` : 'Has data');
      } else {
        console.log('📦 Fallback API call returned null');
      }
    } catch (evalError) {
      console.error('❌ Page evaluate exception:', evalError.message);
      json = null;
    }
  }

  await browser.close();

  if (!json) {
    console.error('❌ API returned null response');
    throw new Error('Failed to retrieve earnings data: No response from API');
  }

  // Return the response even if errno !== 0, so caller can check the error code
  if (json.errno !== 0 && json.errno !== undefined) {
    console.error('❌ API returned error. Response:', JSON.stringify(json, null, 2));
    console.error('❌ errno:', json?.errno, 'error:', json?.error, 'message:', json?.message);
    // Return the error response so caller can check errno
    return json;
  }

  return normalize(json);
}

// Export for use as module
module.exports = { getEarnings, normalize };

// If run directly, execute
if (require.main === module) {
  const deviceId = process.env.WAAREE_DEVICE_ID || '3996d92f-b4e5-490a-b37e-3a617d48077c';
  const storagePath = process.env.WAAREE_STORAGE || 'waaree-state.json';
  
  getEarnings(deviceId, storagePath)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

