#!/usr/bin/env node

/**
 * Test script to verify Waaree login and session validity
 * Usage: node test-login.js
 */

require('dotenv').config();
const { getEarnings } = require('./api');
const fs = require('fs');

async function testLogin() {
  console.log('🧪 Testing Waaree Login and Session...\n');
  
  // Check if session file exists
  const sessionFile = 'waaree-state.json';
  if (!fs.existsSync(sessionFile)) {
    console.error('❌ Session file not found:', sessionFile);
    console.log('   Run: npm run login');
    process.exit(1);
  }
  
  // Check session file content
  console.log('📂 Checking session file...');
  const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
  const hasCookies = sessionData.cookies && sessionData.cookies.length > 0;
  const hasLocalStorage = sessionData.origins && sessionData.origins.some(o => 
    o.localStorage && o.localStorage.length > 0
  );
  
  if (hasCookies) {
    console.log('   ✅ Cookies found:', sessionData.cookies.length);
  } else {
    console.log('   ⚠️  No cookies found');
  }
  
  if (hasLocalStorage) {
    const localStorage = sessionData.origins.find(o => o.localStorage && o.localStorage.length > 0);
    const token = localStorage.localStorage.find(item => item.name === 'token');
    if (token) {
      console.log('   ✅ Token found in localStorage');
      console.log('   📝 Token preview:', token.value.substring(0, 50) + '...');
    } else {
      console.log('   ⚠️  No token in localStorage');
    }
  } else {
    console.log('   ⚠️  No localStorage found');
  }
  
  if (!hasCookies && !hasLocalStorage) {
    console.error('\n❌ Session file is empty!');
    console.log('   Run: npm run login');
    process.exit(1);
  }
  
  console.log('\n🌐 Testing API call with current session...');
  console.log('   (This may take 30-60 seconds)\n');
  
  try {
    const startTime = Date.now();
    const result = await getEarnings();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ API call completed in ${duration} seconds\n`);
    
    if (result.errno === 0 && result.result) {
      const power = result.result.power || 0;
      const generation = result.result.today?.generation || 0;
      
      console.log('📊 API Response:');
      console.log('   ✅ Status: SUCCESS');
      console.log('   ⚡ Power:', power, 'KW =', Math.round(power * 1000), 'Watt');
      console.log('   📈 Generation Today:', generation, 'kWh');
      console.log('   💰 Earnings Today:', result.result.today?.earnings || 0, result.result.currency || 'INR');
      
      if (power === 0 && generation === 0) {
        console.log('\n⚠️  WARNING: Power and generation are both 0');
        console.log('   This could mean:');
        console.log('   - System is off (normal at night)');
        console.log('   - Session expired (try: npm run login)');
        console.log('   - API error (check logs)');
      } else {
        console.log('\n✅ Session is VALID and working!');
      }
      
      process.exit(0);
    } else {
      console.error('\n❌ API returned error:');
      console.error('   Error code:', result.errno);
      console.error('   Error message:', result.error || result.message || 'Unknown error');
      
      if (result.errno === 41809 || result.errno === 403 || result.errno === 401) {
        console.error('\n🔐 Session expired! Run: npm run login');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ API call failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('Session expired') || error.message.includes('41809')) {
      console.error('\n🔐 Session expired! Run: npm run login');
    } else if (error.message.includes('browser') || error.message.includes('chromium')) {
      console.error('\n🌐 Browser issue. Check:');
      console.error('   - Playwright browsers installed: npx playwright install chromium');
      console.error('   - System dependencies: npx playwright install-deps chromium');
    }
    
    process.exit(1);
  }
}

testLogin();

