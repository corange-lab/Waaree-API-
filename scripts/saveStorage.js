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

  // Wait for navigation away from login or some dashboard indicator
  try {
    await Promise.race([
      page.waitForURL((url) => !url.href.includes('/login'), { timeout: 60000 }),
      page.waitForSelector('text=Dashboard', { timeout: 60000 }).catch(() => {}),
    ]);
  } catch (e) {
    // ignore
  }

  // Navigate to inverter detail to ensure session works
  try {
    await page.goto(
      `https://digital.waaree.com/bus/device/inverterDetail?id=${deviceId}&flowType=1&status=3&hasPV=true&hasBattery=false&inParallel=0&wifiMeterID=&wifiMeterSN=`,
      { waitUntil: 'domcontentloaded' }
    );
  } catch (e) {
    // best-effort
  }

  await browserContext.storageState({ path: storagePath });
  console.log(`\nSaved storage state to: ${storagePath}`);

  await browserContext.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


