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

    // Pink's Window Services place ID
    const placeId = 'ChIJk5XuUh8RkFQRXb__t5bgmMc';
    
    // SerpApi endpoint for Google Maps reviews
    const url = `https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${placeId}&api_key=${SERPAPI_KEY}`;
    
    console.log('[SerpApi Reviews] Fetching reviews...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status}`);
    }

    const data = await response.json();
    
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
        error: error.message,
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