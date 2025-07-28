// Test function to debug Google Reviews scraping
export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  console.log('[TEST] Starting Google Reviews test...');

  // Test data to verify the function works
  const testReviews = [
    {
      id: 'test-1',
      author: 'Test User 1',
      rating: 5,
      text: 'This is a test review to verify the function is working.',
      time: '1 hour ago'
    },
    {
      id: 'test-2',
      author: 'Test User 2',
      rating: 4,
      text: 'Another test review with different rating.',
      time: '2 hours ago'
    }
  ];

  try {
    // Try to fetch from Google Maps URL
    const shortUrl = 'https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7';
    
    console.log('[TEST] Attempting to fetch URL:', shortUrl);
    
    // Test if we can even reach Google
    const testResponse = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'manual'
    });
    
    const redirectUrl = testResponse.headers.get('location');
    console.log('[TEST] Redirect URL:', redirectUrl);
    console.log('[TEST] Response status:', testResponse.status);
    console.log('[TEST] Response headers:', Object.fromEntries(testResponse.headers.entries()));

    // Return test data with debug info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        test: true,
        message: 'This is test data. Real scraping may be blocked.',
        debugInfo: {
          originalUrl: shortUrl,
          redirectUrl: redirectUrl,
          responseStatus: testResponse.status,
          functionTimeout: context.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() : 'N/A'
        },
        data: {
          businessName: "Pink's Window Services (TEST MODE)",
          averageRating: 4.9,
          totalReviews: 245,
          reviews: testReviews,
          scrapedAt: new Date().toISOString()
        }
      }),
    };
  } catch (error) {
    console.error('[TEST] Error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        test: true,
        error: error.message,
        message: 'Test function encountered an error',
        data: {
          businessName: "Pink's Window Services (ERROR MODE)",
          averageRating: 5.0,
          totalReviews: 200,
          reviews: testReviews,
          scrapedAt: new Date().toISOString()
        }
      }),
    };
  }
};