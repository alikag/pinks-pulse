// Lightweight Google Reviews fetcher using Google Places API
// This requires a Google Cloud API key with Places API enabled

exports.handler = async (event, context) => {
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
    console.log('[Google Reviews API] Starting...');
    
    // You'll need to set this in Netlify environment variables
    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    // To find your Place ID: https://developers.google.com/maps/documentation/places/web-service/place-id
    const PLACE_ID = process.env.GOOGLE_PLACE_ID || 'ChIJN1t_tDeuEmsRUsoyG83frY4'; // Update with Pink's actual place ID
    
    if (!GOOGLE_API_KEY) {
      console.error('[Google Reviews API] No API key found');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Google Places API key not configured',
          message: 'Please set GOOGLE_PLACES_API_KEY in Netlify environment variables'
        })
      };
    }

    // Google Places API endpoint
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=name,rating,user_ratings_total,reviews&key=${GOOGLE_API_KEY}`;
    
    console.log('[Google Reviews API] Fetching from Google Places API...');
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google API status: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Format reviews for frontend
    const reviews = (data.result.reviews || []).map((review, index) => ({
      id: `google-${index}`,
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.relative_time_description,
      profilePhoto: review.profile_photo_url
    }));

    console.log(`[Google Reviews API] Successfully fetched ${reviews.length} reviews`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          businessName: data.result.name,
          rating: data.result.rating,
          totalReviews: data.result.user_ratings_total,
          reviews: reviews,
          scrapedAt: new Date().toISOString(),
          method: 'google-places-api'
        }
      })
    };

  } catch (error) {
    console.error('[Google Reviews API] Error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to fetch reviews from Google Places API'
      })
    };
  }
};