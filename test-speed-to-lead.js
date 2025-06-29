// Test script to debug speed to lead calculation
const fetch = require('node-fetch');

async function testSpeedToLead() {
  try {
    console.log('Testing Speed to Lead calculation...\n');
    
    // Test the new v2 endpoint
    const response = await fetch('http://localhost:8888/.netlify/functions/dashboard-data-v2');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Data source:', data.dataSource);
    console.log('\nKPI Metrics:');
    console.log('- Speed to Lead (30D):', data.kpiMetrics?.speedToLead30Days, 'minutes');
    console.log('- Quotes This Week:', data.kpiMetrics?.quotesThisWeek);
    console.log('- Converted This Week:', data.kpiMetrics?.convertedThisWeek);
    console.log('- CVR This Week:', data.kpiMetrics?.cvrThisWeek, '%');
    
    if (data.kpiMetrics?.dataQuality) {
      console.log('\nData Quality:');
      console.log('- Total Requests:', data.kpiMetrics.dataQuality.totalRequests);
      console.log('- Valid Requests:', data.kpiMetrics.dataQuality.validRequests);
      console.log('- Requests with Speed to Lead data:', data.kpiMetrics.dataQuality.validRequests);
    }
    
    // Also test the old endpoint for comparison
    console.log('\n\nTesting old endpoint for comparison...');
    const oldResponse = await fetch('http://localhost:8888/.netlify/functions/dashboard-data-sales');
    const oldData = await oldResponse.json();
    
    console.log('Old endpoint Speed to Lead:', oldData.kpiMetrics?.speedToLead30Days, 'minutes');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSpeedToLead();