// Google Reviews fetcher using a proxy service
// This avoids CORS issues and doesn't require heavy dependencies

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    console.log('[Google Reviews Proxy] Starting...');
    
    // Using AllOrigins proxy to bypass CORS
    const googleMapsUrl = 'https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleMapsUrl)}`;
    
    console.log('[Google Reviews Proxy] Fetching via proxy...');
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();
    const html = data.contents;
    
    // Extract business info from HTML
    const businessName = extractFromHtml(html, /<meta property="og:title" content="([^"]+)"/, 'Pink\'s Window Services');
    
    // Try to find JSON-LD data which Google often includes
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    let reviews = [];
    let rating = 0;
    let totalReviews = 0;
    
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.aggregateRating) {
          rating = parseFloat(jsonData.aggregateRating.ratingValue) || 0;
          totalReviews = parseInt(jsonData.aggregateRating.reviewCount) || 0;
        }
        if (jsonData.review && Array.isArray(jsonData.review)) {
          reviews = jsonData.review.slice(0, 10).map((r, i) => ({
            id: `proxy-${i}`,
            author: r.author?.name || 'Anonymous',
            rating: r.reviewRating?.ratingValue || 5,
            text: r.reviewBody || '',
            time: r.datePublished ? new Date(r.datePublished).toLocaleDateString() : 'Recently'
          }));
        }
      } catch (e) {
        console.error('[Google Reviews Proxy] Failed to parse JSON-LD:', e);
      }
    }
    
    // If no reviews found in JSON-LD, return empty (no fallback)
    if (reviews.length === 0) {
      console.log('[Google Reviews Proxy] No reviews found in page data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No reviews found',
          message: 'Could not extract reviews from Google Maps page'
        })
      };
    }

    console.log(`[Google Reviews Proxy] Found ${reviews.length} reviews`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          businessName,
          rating,
          totalReviews,
          reviews,
          scrapedAt: new Date().toISOString(),
          method: 'proxy'
        }
      })
    };

  } catch (error) {
    console.error('[Google Reviews Proxy] Error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to fetch reviews via proxy'
      })
    };
  }
};

function extractFromHtml(html, regex, defaultValue = null) {
  const match = html.match(regex);
  return match ? match[1] : defaultValue;
}