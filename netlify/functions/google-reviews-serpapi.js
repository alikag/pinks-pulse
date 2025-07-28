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

    // Pink's Window Services - we need to find the correct place_id
    // First, let's search for Pink's Window Services
    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=Pink%27s+Window+Services+Seattle&api_key=${SERPAPI_KEY}`;
    
    console.log('[SerpApi Reviews] Searching for Pink\'s Window Services...');
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[SerpApi Reviews] Search error:', searchResponse.status, errorText);
      throw new Error(`SerpApi search error: ${searchResponse.status} - ${errorText}`);
    }

    const searchData = await searchResponse.json();
    console.log('[SerpApi Reviews] Search results:', searchData.local_results?.length || 0, 'businesses found');
    
    // Find Pink's in the results
    const pinksResult = searchData.local_results?.find(result => 
      result.title?.toLowerCase().includes("pink") && 
      result.title?.toLowerCase().includes("window")
    );
    
    if (!pinksResult || !pinksResult.place_id) {
      console.error('[SerpApi Reviews] Could not find Pink\'s Window Services in search results');
      throw new Error('Pink\'s Window Services not found in search results');
    }
    
    console.log('[SerpApi Reviews] Found Pink\'s:', pinksResult.title, 'Place ID:', pinksResult.place_id);
    
    // Now get the reviews using the place_id
    const reviewsUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${pinksResult.place_id}&api_key=${SERPAPI_KEY}`;
    
    console.log('[SerpApi Reviews] Fetching reviews...');
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