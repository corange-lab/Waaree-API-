#!/usr/bin/env node

/**
 * Push Waaree data from local machine to server
 * Run this on your Mac to scrape data and push to server
 * Usage: node push-to-server.js
 */

const { getEarnings } = require('./api');
const axios = require('axios');

const SERVER_URL = process.env.WAAREE_SERVER_URL || 'http://144.24.114.26:8888';

async function pushToServer() {
  try {
    console.log('🔄 Fetching Waaree data...');
    const data = await getEarnings();
    
    if (data.errno === 0 && data.result) {
      const powerKW = data.result.power || 0;
      const gen = data.result.today?.generation || 0;
      
      const payload = {
        powerOutput: `${Math.round(powerKW * 1000)} Watt`,
        yieldToday: `${parseFloat(gen.toFixed(1))}kWh`,
        spoken: `Power output is ${Math.round(powerKW * 1000)} Watt. Yield today is ${parseFloat(gen.toFixed(1))}kWh.`
      };
      
      console.log('📤 Pushing to server:', payload);
      
      // Push to server
      const response = await axios.post(`${SERVER_URL}/update-cache`, payload, {
        timeout: 10000
      });
      
      if (response.data.success) {
        console.log('✅ Data pushed to server successfully!');
        console.log('   Power:', payload.powerOutput);
        console.log('   Yield:', payload.yieldToday);
      } else {
        console.error('❌ Server returned error:', response.data);
      }
    } else {
      console.error('❌ Failed to fetch data:', data.errno);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Server response:', error.response.data);
    }
  }
}

// Run once
if (require.main === module) {
  pushToServer().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { pushToServer };

