import axios from 'axios';

// Test the sales dashboard data endpoint
async function testSalesDashboardData() {
  try {
    console.log('Testing dashboard-data-sales endpoint...');
    
    // Try local Netlify Functions port
    const localUrl = 'http://localhost:9999/.netlify/functions/dashboard-data-sales';
    console.log(`Fetching from: ${localUrl}`);
    
    const response = await axios.get(localUrl);
    console.log('Response status:', response.status);
    console.log('Response data structure:');
    console.log('- timeSeries:', Object.keys(response.data.timeSeries || {}));
    console.log('- salespersons count:', response.data.salespersons?.length || 0);
    console.log('- lastUpdated:', response.data.lastUpdated);
    
    // Check if data has the expected structure
    if (response.data.timeSeries && response.data.timeSeries.week) {
      console.log('\nWeek data sample:');
      console.log('- labels:', response.data.timeSeries.week.labels);
      console.log('- totalSent:', response.data.timeSeries.week.totalSent);
      console.log('- totalConverted:', response.data.timeSeries.week.totalConverted);
    }
    
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSalesDashboardData();