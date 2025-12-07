const { chromium } = require('playwright');

async function smartClick(page, selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      return true;
    }
  }
  return false;
}

async function smartFill(page, candidates, value) {
  for (const sel of candidates) {
    const el = await page.$(sel);
    if (el) {
      await el.fill(value);
      return true;
    }
  }
  return false;
}

async function main() {
  const storagePath = process.env.WAAREE_STORAGE || 'waaree-state.json';
  const deviceId = process.env.WAAREE_DEVICE_ID || '3996d92f-b4e5-490a-b37e-3a617d48077c';
  const username = process.env.WAAREE_USERNAME || 'chirag31';
  const password = process.env.WAAREE_PASSWORD || 'Chirag31';

  const userDataDir = process.env.WAAREE_USER_DATA_DIR || '.waaree-user-data';
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
  });

  const page = await browserContext.newPage();

  // Go directly to login
  await page.goto('https://digital.waaree.com/login', { waitUntil: 'domcontentloaded' });

  // Try to fill username
  await smartFill(page, [
    'input[name="username"]',
    'input#username',
    'input[placeholder*="User"]',
    'input[type="text"]',
  ], username);

  // Try to fill password
  await smartFill(page, [
    'input[name="password"]',
    'input#password',
    'input[placeholder*="Password"]',
    'input[type="password"]',
  ], password);

  // Try clicking Login/Sign In button
  await smartClick(page, [
    'button[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign In")',
    'text=Login',
  ]);

  // Wait for navigation away from login - ensure we're actually logged in
  console.log('Waiting for login to complete...');
  try {
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 60000 });
    console.log('✅ Successfully navigated away from login page');
  } catch (e) {
    console.error('❌ Login may have failed - still on login page');
    throw new Error('Login failed - could not navigate away from login page');
  }

  // Wait a bit for session to be established
  await page.waitForTimeout(2000);

  // Navigate to dashboard or home to ensure session is active
  try {
    await page.goto('https://digital.waaree.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to dashboard');
  } catch (e) {
    console.log('⚠️ Dashboard navigation issue:', e.message);
  }

  // Navigate to inverter detail to establish full session
  console.log('Navigating to device page to establish session...');
  try {
    await page.goto(
      `https://digital.waaree.com/bus/device/inverterDetail?id=${deviceId}&flowType=1&status=3&hasPV=true&hasBattery=false&inParallel=0&wifiMeterID=&wifiMeterSN=`,
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    
    // Wait for page to fully load and initialize
    await page.waitForTimeout(5000);
    console.log('✅ Device page loaded');
    
    // Verify we can access the API - this ensures session is valid
    try {
      const apiTest = await page.evaluate(async (id) => {
        try {
          const url = new URL('/c/v0/device/earnings', window.location.origin);
          url.searchParams.set('deviceID', id);
          const resp = await fetch(url, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
          if (!resp.ok) {
            return { success: false, status: resp.status };
          }
          const data = await resp.json();
          return { success: data.errno === 0, errno: data.errno };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }, deviceId);
      
      if (apiTest.success) {
        console.log('✅ API test successful - session is valid');
      } else {
        console.log('⚠️ API test result:', apiTest.errno || apiTest.error || 'Unknown error');
      }
    } catch (apiError) {
      console.log('⚠️ API test error (session may still be valid):', apiError.message);
    }
  } catch (e) {
    console.error('❌ Error navigating to device page:', e.message);
    throw e;
  }

  // Save storage state - this should now have cookies and localStorage
  await browserContext.storageState({ path: storagePath });
  
  // Verify the state was saved properly
  const fs = require('fs');
  const savedState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
  const hasCookies = savedState.cookies && savedState.cookies.length > 0;
  const hasLocalStorage = savedState.origins && savedState.origins.some(o => 
    o.localStorage && o.localStorage.length > 0
  );
  
  if (hasCookies || hasLocalStorage) {
    console.log(`\n✅ Saved storage state to: ${storagePath}`);
    console.log(`   - Cookies: ${hasCookies ? 'Yes' : 'No'}`);
    console.log(`   - LocalStorage: ${hasLocalStorage ? 'Yes' : 'No'}`);
  } else {
    console.warn(`\n⚠️ Storage state saved but appears empty. Session may not work.`);
  }

  await browserContext.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


