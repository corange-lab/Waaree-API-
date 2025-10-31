const { chromium } = require('playwright');

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

async function main() {
  const storagePath = process.env.WAAREE_STORAGE || 'waaree-state.json';
  const deviceId = process.env.WAAREE_DEVICE_ID || '3996d92f-b4e5-490a-b37e-3a617d48077c';

  const browser = await chromium.launch({ 
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();

  // Log all network requests for debugging
  if (process.env.DEBUG_NETWORK) {
    page.on('request', request => {
      if (request.url().includes('earnings')) {
        console.error('REQ:', request.method(), request.url());
      }
    });
    page.on('response', response => {
      if (response.url().includes('earnings')) {
        console.error('RESP:', response.status(), response.url());
      }
    });
  }

  // Set up response listener BEFORE navigating
  let earningsResponse = null;
  const responsePromise = page.waitForResponse(
    (response) => {
      const url = response.url();
      return url.includes('/c/v0/device/earnings') && 
             url.includes('deviceID=') &&
             response.request().method() === 'GET';
    },
    { timeout: 90000 }
  ).then(resp => { earningsResponse = resp; return resp; }).catch(() => null);

  // Navigate to the inverter detail page - the page's JS will make the API call
  const detailUrl = `https://digital.waaree.com/bus/device/inverterDetail?id=${deviceId}&flowType=1&status=3&hasPV=true&hasBattery=false&inParallel=0&wifiMeterID=&wifiMeterSN=`;
  
  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 90000 });

  // Wait longer for the page JavaScript to initialize and make API calls
  await page.waitForTimeout(5000);

  // Also try clicking on any earnings/yield tab if it exists
  const tabSelectors = [
    'text=Earnings',
    'text=Yield',
    'text=Overview',
    'text=Generation',
    '[role="tab"]:has-text("Earnings")',
    '[role="tab"]:has-text("Yield")',
    'button:has-text("Earnings")',
    'button:has-text("Yield")',
  ];
  
  for (const sel of tabSelectors) {
    try {
      const element = await page.$(sel);
      if (element) {
        await element.click();
        await page.waitForTimeout(3000);
        break; // Stop after first successful click
      }
    } catch {}
  }

  // Wait for the response with longer timeout
  try {
    await Promise.race([
      responsePromise,
      new Promise(resolve => setTimeout(resolve, 10000))
    ]);
  } catch {}

  let json = null;
  if (earningsResponse) {
    try {
      json = await earningsResponse.json();
    } catch (e) {
      console.error('Failed to parse earnings response:', e.message);
    }
  }

  // If we didn't get it via response, try evaluating in page context
  if (!json || json.errno !== 0) {
    json = await page.evaluate(async (id) => {
      // Try to find and call the earnings function directly
      const makeRequest = async () => {
        // Look for axios instance
        const axios = window.axios || (window.$ && window.$.axios);
        if (axios) {
          try {
            const resp = await axios.get('/c/v0/device/earnings', {
              params: { deviceID: id }
            });
            return resp.data || resp;
          } catch (e) {
            console.error('Axios request failed:', e);
          }
        }
        
        // Fallback: try fetch with credentials
        try {
          const url = new URL('/c/v0/device/earnings', window.location.origin);
          url.searchParams.set('deviceID', id);
          const resp = await fetch(url, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            }
          });
          return await resp.json();
        } catch (e) {
          console.error('Fetch request failed:', e);
          return null;
        }
      };

      return await makeRequest();
    }, deviceId);
  }

  if (!json) {
    throw new Error('Failed to retrieve earnings data - API may require authentication refresh');
  }

  if (process.env.DEBUG_RAW) {
    console.error('RAW:', JSON.stringify(json));
  }

  const out = normalize(json);
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


