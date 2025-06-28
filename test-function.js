// Test script for dashboard-data function
require('dotenv').config();

// Import the debug function
const { handler } = require('./netlify/functions/dashboard-data-debug.js');

// Mock event object
const mockEvent = {
  httpMethod: 'GET',
  headers: {},
  body: null
};

// Mock context object
const mockContext = {};

// Test the function
async function testFunction() {
  console.log('Testing dashboard-data-debug function...\n');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('BIGQUERY_PROJECT_ID:', process.env.BIGQUERY_PROJECT_ID ? 'Set' : 'Not set');
  console.log('GOOGLE_APPLICATION_CREDENTIALS_JSON:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'Set (length: ' + process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length + ')' : 'Not set');
  console.log('\n');

  try {
    const response = await handler(mockEvent, mockContext);
    
    console.log('Response status:', response.statusCode);
    console.log('\nResponse body:');
    
    const data = JSON.parse(response.body);
    
    // Pretty print the response
    console.log(JSON.stringify(data, null, 2));
    
    // Highlight key debug information
    if (data.debugInfo) {
      console.log('\n=== DEBUG INFORMATION ===');
      console.log('Timezone:', data.debugInfo.timezone);
      console.log('Current time:', data.debugInfo.now);
      console.log('\nQuotes date range:', data.debugInfo.quotesDateRange);
      console.log('\nJobs date range:', data.debugInfo.jobsDateRange);
      console.log('\nDate filtering test:', data.debugInfo.dateFilteringTest);
      console.log('\nSample quotes:', data.debugInfo.sampleQuotes);
    }
    
    if (data.error) {
      console.log('\n=== ERROR INFORMATION ===');
      console.log('Error:', data.error.message);
      console.log('Stack:', data.error.stack);
    }
    
  } catch (error) {
    console.error('Error running function:', error);
  }
}

// Run the test
testFunction();