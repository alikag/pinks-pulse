// Test SerpApi connection and place search
export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    
    if (!SERPAPI_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'No SERPAPI_KEY found in environment variables'
        })
      };
    }

    // First, search for Pink's Window Services to verify it exists
    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=Pink%27s+Window+Services+Seattle&api_key=${SERPAPI_KEY}`;
    
    console.log('[Test SerpApi] Searching for business...');
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    // Find Pink's in the results
    const pinksResult = searchData.local_results?.find(result => 
      result.title?.toLowerCase().includes("pink") && 
      result.title?.toLowerCase().includes("window")
    );
    
    // Now try to get reviews using different methods
    const results = {
      searchResults: {
        found: !!pinksResult,
        business: pinksResult ? {
          title: pinksResult.title,
          place_id: pinksResult.place_id,
          data_id: pinksResult.data_id,
          rating: pinksResult.rating,
          reviews: pinksResult.reviews
        } : null,
        totalResults: searchData.local_results?.length || 0
      },
      reviewsAttempts: []
    };
    
    // Try method 1: Using place_id from search
    if (pinksResult?.place_id) {
      try {
        const reviewsUrl1 = `https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${pinksResult.place_id}&api_key=${SERPAPI_KEY}`;
        const reviewsResponse1 = await fetch(reviewsUrl1);
        const reviewsData1 = await reviewsResponse1.json();
        
        results.reviewsAttempts.push({
          method: 'place_id_from_search',
          place_id: pinksResult.place_id,
          success: !!reviewsData1.reviews,
          reviewCount: reviewsData1.reviews?.length || 0,
          error: reviewsData1.error
        });
      } catch (e) {
        results.reviewsAttempts.push({
          method: 'place_id_from_search',
          error: e.message
        });
      }
    }
    
    // Try method 2: Using data_id from search
    if (pinksResult?.data_id) {
      try {
        const reviewsUrl2 = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${pinksResult.data_id}&api_key=${SERPAPI_KEY}`;
        const reviewsResponse2 = await fetch(reviewsUrl2);
        const reviewsData2 = await reviewsResponse2.json();
        
        results.reviewsAttempts.push({
          method: 'data_id_from_search',
          data_id: pinksResult.data_id,
          success: !!reviewsData2.reviews,
          reviewCount: reviewsData2.reviews?.length || 0,
          error: reviewsData2.error
        });
      } catch (e) {
        results.reviewsAttempts.push({
          method: 'data_id_from_search',
          error: e.message
        });
      }
    }
    
    // Try method 3: Using hardcoded place_id
    try {
      const hardcodedPlaceId = 'ChIJk5XuUh8RkFQRXb__t5bgmMc';
      const reviewsUrl3 = `https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${hardcodedPlaceId}&api_key=${SERPAPI_KEY}`;
      const reviewsResponse3 = await fetch(reviewsUrl3);
      const reviewsData3 = await reviewsResponse3.json();
      
      results.reviewsAttempts.push({
        method: 'hardcoded_place_id',
        place_id: hardcodedPlaceId,
        success: !!reviewsData3.reviews,
        reviewCount: reviewsData3.reviews?.length || 0,
        error: reviewsData3.error,
        response: reviewsData3
      });
    } catch (e) {
      results.reviewsAttempts.push({
        method: 'hardcoded_place_id',
        error: e.message
      });
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };
    
  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
}