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
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

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
  
  // Use domcontentloaded for faster load, then wait for API
  await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Try triggering the API call immediately via page context
  await Promise.all([
    responsePromise,
    page.evaluate(async (id) => {
      // Try to trigger API call immediately if axios is available
      try {
        const axios = window.axios || (window.$ && window.$.axios);
        if (axios) {
          axios.get('/c/v0/device/earnings', { params: { deviceID: id } }).catch(() => {});
        } else {
          // Fallback: try fetch
          const url = new URL('/c/v0/device/earnings', window.location.origin);
          url.searchParams.set('deviceID', id);
          fetch(url, { credentials: 'include' }).catch(() => {});
        }
      } catch (e) {}
    }, deviceId)
  ]);

  // Wait max 2 seconds for response
  await Promise.race([
    responsePromise,
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);

  let json = null;
  
  // Get response if available
  if (earningsResponse) {
    try {
      json = await earningsResponse.json();
    } catch (e) {}
  }

  // Fallback: try direct API call in page context
  if (!json || json.errno !== 0) {
    json = await page.evaluate(async (id) => {
      try {
        const axios = window.axios || (window.$ && window.$.axios);
        if (axios) {
          const resp = await axios.get('/c/v0/device/earnings', {
            params: { deviceID: id }
          });
          return resp.data || resp;
        }
      } catch (e) {}
      
      try {
        const url = new URL('/c/v0/device/earnings', window.location.origin);
        url.searchParams.set('deviceID', id);
        const resp = await fetch(url, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        return await resp.json();
      } catch (e) {
        return null;
      }
    }, deviceId);
  }

  await browser.close();

  if (!json || (json.errno !== 0 && json.errno !== undefined)) {
    throw new Error('Failed to retrieve earnings data');
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

