// Google Reviews fetcher using SerpApi (reliable, no browser needed)
// Requires SERPAPI_KEY in environment variables

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('[SerpApi Reviews] Starting...');
    
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    
    if (!SERPAPI_KEY) {
      console.error('[SerpApi Reviews] No API key found');
      // Return empty reviews instead of error to keep dashboard working
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          data: {
            businessName: "Pink's Window Services",
            reviews: [],
            scrapedAt: new Date().toISOString(),
            method: 'serpapi-no-key'
          }
        })
      };
    }

    // Pink's Window Services Place ID from https://maps.app.goo.gl/ftntjbFPabdRr5BF9
    // When you visit this URL, it redirects to the full Google Maps page with place details
    // The place_id can be extracted from the data parameter in the URL
    const PINKS_PLACE_ID = 'ChIJk5XuUh8RkFQRXb__t5bgmMc';
    
    // Get reviews directly using the known place_id
    // Add hl=en to ensure English results and sort_by to get newest first
    const reviewsUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${PINKS_PLACE_ID}&hl=en&sort_by=newestFirst&api_key=${SERPAPI_KEY}`;
    
    console.log('[SerpApi Reviews] Fetching reviews for place_id:', PINKS_PLACE_ID);
    const response = await fetch(reviewsUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SerpApi Reviews] Reviews error:', response.status, errorText);
      throw new Error(`SerpApi reviews error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[SerpApi Reviews] Reviews response:', {
      hasReviews: !!data.reviews,
      reviewCount: data.reviews?.length || 0,
      placeInfo: data.place_info
    });
    
    // Extract and format reviews
    const reviews = (data.reviews || []).slice(0, 10).map((review, index) => ({
      id: `serpapi-${index}`,
      author: review.user?.name || 'Anonymous',
      rating: review.rating || 5,
      text: review.snippet || '',
      time: review.date || 'Recently'
    }));

    console.log(`[SerpApi Reviews] Successfully fetched ${reviews.length} reviews`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          businessName: data.place_info?.title || "Pink's Window Services",
          rating: data.place_info?.rating,
          totalReviews: data.place_info?.reviews,
          reviews: reviews,
          scrapedAt: new Date().toISOString(),
          method: 'serpapi'
        }
      })
    };

  } catch (error) {
    console.error('[SerpApi Reviews] Error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        errorDetails: {
          message: error.message,
          type: error.constructor.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        data: {
          businessName: "Pink's Window Services",
          reviews: [],
          scrapedAt: new Date().toISOString(),
          method: 'serpapi-error'
        }
      })
    };
  }
}