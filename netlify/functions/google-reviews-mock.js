exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Mock Google Reviews data
    // In production, this would fetch from Google My Business API or BigQuery
    const mockReviews = {
      success: true,
      data: {
        businessName: "Pink's Window Cleaning - Hudson Valley",
        rating: 4.8,
        totalReviews: 127,
        reviews: [
          {
            reviewerName: "Sarah Mitchell",
            rating: 5,
            text: "Pink's team did an amazing job on our storefront windows. Professional, punctual, and the results speak for themselves!",
            date: "2 days ago"
          },
          {
            reviewerName: "Michael Chen",
            rating: 5,
            text: "Best window cleaning service in the Hudson Valley. They've been maintaining our office building for 2 years now.",
            date: "1 week ago"
          },
          {
            reviewerName: "Jennifer Rodriguez",
            rating: 5,
            text: "Exceptional service! The crew was courteous and efficient. Our home's windows have never looked better.",
            date: "2 weeks ago"
          }
        ],
        scrapedAt: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockReviews)
    };

  } catch (error) {
    console.error('Error in google-reviews-mock:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};