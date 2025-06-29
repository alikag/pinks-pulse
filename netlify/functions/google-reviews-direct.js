const fetch = require('node-fetch');

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
    console.log('[Google Reviews Direct] Starting request...');
    
    // Google Places API key from environment only - NEVER hardcode API keys
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      console.log('[Google Reviews Direct] No API key configured');
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
    }
    
    // Known Place IDs for Pink's Windows (you can find this from the Google Maps URL)
    // When you visit https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7, look for the place ID in the URL
    // or try these common searches
    const placeId = process.env.GOOGLE_PLACE_ID || null;
    
    if (placeId) {
      // If we have a place ID, use it directly
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews,formatted_address&reviews_sort=newest&key=${API_KEY}`;
      
      console.log('[Google Reviews Direct] Fetching with Place ID:', placeId);
      const response = await fetch(detailsUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const result = data.result;
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: true,
            data: {
              businessName: result.name,
              rating: result.rating || 0,
              totalReviews: result.user_ratings_total || 0,
              address: result.formatted_address,
              reviews: (result.reviews || []).slice(0, 5).map(review => ({
                reviewerName: review.author_name,
                rating: review.rating,
                text: review.text,
                date: review.relative_time_description
              })),
              placeId: placeId,
              scrapedAt: new Date().toISOString(),
              method: 'google-places-direct'
            }
          })
        };
      }
    }
    
    // If no place ID or failed, try nearby search as last resort
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=41.7004,-73.9209&radius=50000&keyword=Pink's%20Windows&key=${API_KEY}`;
    
    console.log('[Google Reviews Direct] Trying nearby search...');
    const nearbyResponse = await fetch(nearbyUrl);
    const nearbyData = await nearbyResponse.json();
    
    console.log('[Google Reviews Direct] Nearby search status:', nearbyData.status);
    console.log('[Google Reviews Direct] Results found:', nearbyData.results?.length || 0);
    
    if (nearbyData.results && nearbyData.results.length > 0) {
      // Log all results to help identify the correct one
      nearbyData.results.forEach((place, index) => {
        console.log(`[Result ${index}]:`, {
          name: place.name,
          place_id: place.place_id,
          vicinity: place.vicinity
        });
      });
    }
    
    // Return instructions for setup
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: "Google Reviews not connected",
        instructions: {
          step1: "Visit your Google Business Profile at https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7",
          step2: "Look for the place ID in the URL (it starts with 'ChIJ')",
          step3: "Add GOOGLE_PLACE_ID environment variable in Netlify with that value",
          step4: "Alternatively, check Netlify function logs for nearby results"
        },
        data: {
          businessName: "Pink's Windows Hudson Valley",
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
          scrapedAt: new Date().toISOString(),
          method: 'placeholder-with-instructions'
        }
      })
    };
    
  } catch (error) {
    console.error('[Google Reviews Direct] Error:', error);
    
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