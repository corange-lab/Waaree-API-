const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

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

async function autoLogin() {
  const storagePath = 'waaree-state.json';
  const deviceId = process.env.WAAREE_DEVICE_ID || '3996d92f-b4e5-490a-b37e-3a617d48077c';
  const username = process.env.WAAREE_USERNAME || 'chirag31';
  const password = process.env.WAAREE_PASSWORD || 'Chirag31';

  console.log('🔐 Attempting automatic login...');

  try {
    // Force use regular chromium instead of headless shell
    const os = require('os');
    const chromiumPath = `${os.homedir()}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`;
    
    let browserOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    
    if (fs.existsSync(chromiumPath)) {
      browserOptions.executablePath = chromiumPath;
    }
    
    const browser = await chromium.launch(browserOptions);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go directly to login
    console.log('🌐 Navigating to login page...');
    await page.goto('https://digital.waaree.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try to fill username
    console.log('📝 Filling credentials...');
    await smartFill(page, ['input[name="username"]', 'input#username', 'input[placeholder*="User"]', 'input[type="text"]'], username);
    
    // Try to fill password
    await smartFill(page, ['input[name="password"]', 'input#password', 'input[placeholder*="Password"]', 'input[type="password"]'], password);
    
    // Try clicking Login button
    await smartClick(page, ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")', 'text=Login']);
    
    console.log('⏳ Waiting for login to complete...');
    await page.waitForTimeout(3000);

    // Wait for navigation away from login
    try {
      await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30000 });
      console.log('✅ Successfully navigated away from login page');
    } catch (e) {
      throw new Error('Login timeout - credentials may be incorrect or page structure changed');
    }

    // Navigate to dashboard to establish session
    await page.goto('https://digital.waaree.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Navigate to device page to fully establish session
    console.log('🌐 Establishing session on device page...');
    await page.goto(
      `https://digital.waaree.com/bus/device/inverterDetail?id=${deviceId}&flowType=1&status=3&hasPV=true&hasBattery=false&inParallel=0&wifiMeterID=&wifiMeterSN=`,
      { waitUntil: 'networkidle', timeout: 30000 }
    );
    await page.waitForTimeout(3000);

    // Save storage state
    await context.storageState({ path: storagePath });
    
    // Verify state was saved
    const savedState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const hasCookies = savedState.cookies && savedState.cookies.length > 0;
    const hasLocalStorage = savedState.origins && savedState.origins.some(o => 
      o.localStorage && o.localStorage.length > 0
    );
    
    if (hasCookies || hasLocalStorage) {
      console.log('✅ Auto-login successful, storage saved');
      console.log(`   - Cookies: ${hasCookies ? 'Yes' : 'No'}`);
      console.log(`   - LocalStorage: ${hasLocalStorage ? 'Yes' : 'No'}`);
    } else {
      console.warn('⚠️ Auto-login completed but storage appears empty');
    }
    
    await browser.close();
    return true;
  } catch (error) {
    console.error('❌ Auto-login failed:', error.message);
    return false;
  }
}

module.exports = { autoLogin };

// Run if called directly
if (require.main === module) {
  autoLogin().then(success => {
    process.exit(success ? 0 : 1);
  });
}

