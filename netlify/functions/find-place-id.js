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
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Try multiple search strategies
    const searches = [
      {
        query: "Pink's Windows Hudson Valley",
        location: "41.7004,-73.9209",
        radius: 50000
      },
      {
        query: "Pink Windows cleaning service",
        location: "41.7004,-73.9209",
        radius: 50000
      },
      {
        query: "window cleaning",
        location: "41.7004,-73.9209",
        radius: 20000
      }
    ];

    const allResults = [];

    for (const search of searches) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${encodeURIComponent(search.query)}&location=${search.location}&radius=${search.radius}&key=${API_KEY}`;
      
      console.log(`[Find Place ID] Searching: ${search.query}`);
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results) {
        data.results.forEach(place => {
          allResults.push({
            name: place.name,
            place_id: place.place_id,
            address: place.vicinity,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            search_query: search.query
          });
        });
      }
    }

    // Sort by relevance (places with "Pink" in name first)
    allResults.sort((a, b) => {
      const aHasPink = a.name.toLowerCase().includes('pink');
      const bHasPink = b.name.toLowerCase().includes('pink');
      if (aHasPink && !bHasPink) return -1;
      if (!aHasPink && bHasPink) return 1;
      return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: "Search results for window cleaning services near Hudson Valley",
        instructions: [
          "1. Look through the results below to find Pink's Windows",
          "2. Note the place_id of your business",
          "3. Add GOOGLE_PLACE_ID to Netlify environment variables",
          "4. The Google Reviews will then load automatically"
        ],
        results: allResults.slice(0, 20), // Top 20 results
        total_found: allResults.length
      })
    };

  } catch (error) {
    console.error('[Find Place ID] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        suggestion: "Check API key and ensure Places API is enabled"
      })
    };
  }
};