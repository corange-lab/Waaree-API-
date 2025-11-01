const { chromium } = require('playwright');
const fs = require('fs');

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
  const username = process.env.WAAREE_USERNAME || 'chirag31';
  const password = process.env.WAAREE_PASSWORD || 'Chirag31';

  console.log('Attempting automatic login...');

  try {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go directly to login
    await page.goto('https://digital.waaree.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await page.waitForTimeout(2000);

    // Try to fill username
    await smartFill(page, ['input[name="username"]', 'input#username', 'input[placeholder*="User"]', 'input[type="text"]'], username);
    
    // Try to fill password
    await smartFill(page, ['input[name="password"]', 'input#password', 'input[placeholder*="Password"]', 'input[type="password"]'], password);
    
    // Try clicking Login button
    await smartClick(page, ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")', 'text=Login']);
    
    await page.waitForTimeout(3000);

    // Wait for navigation away from login
    try {
      await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30000 });
    } catch (e) {
      throw new Error('Login timeout - credentials may be incorrect');
    }

    // Save storage state
    await context.storageState({ path: storagePath });
    console.log('✅ Login successful, storage saved');
    
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

