// Test script for dashboard-data-nofilter function
require('dotenv').config();

// Import the no-filter function
const { handler } = require('./netlify/functions/dashboard-data-nofilter.js');

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
  console.log('Testing dashboard-data-nofilter function...\n');
  
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
    
  } catch (error) {
    console.error('Error running function:', error);
  }
}

// Run the test
testFunction();