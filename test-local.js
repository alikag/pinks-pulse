// Simple local test to verify BigQuery connection
// Usage: node test-local.js

const fetch = require('node-fetch');

async function testEndpoint(name, url) {
  console.log(`\n=== Testing ${name} ===`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Error:', response.status);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

async function runTests() {
  const baseUrl = 'https://pinkspulse.netlify.app/.netlify/functions';
  
  // Test endpoints
  await testEndpoint('Main Dashboard Data', `${baseUrl}/dashboard-data`);
  await testEndpoint('Test BigQuery Connection', `${baseUrl}/test-bigquery`);
  await testEndpoint('Debug Info', `${baseUrl}/dashboard-data-debug`);
  await testEndpoint('No Filter Data', `${baseUrl}/dashboard-data-nofilter`);
}

// Check if node-fetch is installed
try {
  require('node-fetch');
  runTests();
} catch (error) {
  console.log('Please install node-fetch first: npm install node-fetch@2');
}