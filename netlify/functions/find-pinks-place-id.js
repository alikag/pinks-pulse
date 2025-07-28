// Helper function to find Pink's Window Services Place ID
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
          error: 'No SERPAPI_KEY found',
          suggestion: 'Add SERPAPI_KEY to Netlify environment variables'
        })
      };
    }

    // Search for Pink's Window Services
    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=Pink%27s+Window+Services+Seattle+WA&api_key=${SERPAPI_KEY}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    // Find all businesses with "Pink" in the name
    const pinkBusinesses = data.local_results?.filter(result => 
      result.title?.toLowerCase().includes("pink")
    ) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        search_query: "Pink's Window Services Seattle WA",
        total_results: data.local_results?.length || 0,
        pink_businesses: pinkBusinesses.map(b => ({
          title: b.title,
          place_id: b.place_id,
          address: b.address,
          rating: b.rating,
          reviews: b.reviews,
          type: b.type
        })),
        all_results: data.local_results?.map(b => b.title) || []
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
}