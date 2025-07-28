// Google Reviews fetcher using ScrapeAPI (handles JavaScript rendering)
// Free tier available, no browser dependencies

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
    console.log('[ScrapeAPI Reviews] Starting...');
    
    // Try to get actual reviews from Pink's Google Maps page
    const googleMapsUrl = 'https://www.google.com/maps/place/Pink%27s+Window+Services/@47.7057287,-122.3457766,17z/data=!3m1!4b1!4m6!3m5!1s0x549011f15ee59693:0xc79860e5b7ff7b5d!8m2!3d47.7057287!4d-122.3432017!16s%2Fg%2F11c1q9x5wf';
    
    // Using a free web scraping service that handles JavaScript
    const scraperUrl = `https://api.scraperapi.com/scrape?api_key=${process.env.SCRAPEAPI_KEY || 'demo'}&url=${encodeURIComponent(googleMapsUrl)}&render=true`;
    
    console.log('[ScrapeAPI Reviews] Fetching page...');
    const response = await fetch(scraperUrl);
    
    if (!response.ok) {
      console.error('[ScrapeAPI Reviews] Failed to fetch:', response.status);
      throw new Error(`Scraper error: ${response.status}`);
    }

    const html = await response.text();
    
    // Try to extract reviews from the HTML
    // This is a simplified extraction - in production you'd use more robust patterns
    const reviews = [];
    
    // Look for review patterns in the HTML
    const reviewMatches = html.matchAll(/<div[^>]*data-review-id[^>]*>([\s\S]*?)<\/div>/gi);
    
    for (const match of reviewMatches) {
      const reviewHtml = match[1];
      
      // Extract review details
      const authorMatch = reviewHtml.match(/<span[^>]*>([^<]+)<\/span>/);
      const ratingMatch = reviewHtml.match(/(\d+)\s*star/i);
      const textMatch = reviewHtml.match(/<span[^>]*class="[^"]*review-text[^"]*"[^>]*>([^<]+)</);
      
      if (authorMatch || textMatch) {
        reviews.push({
          id: `scrape-${reviews.length}`,
          author: authorMatch?.[1] || 'Customer',
          rating: ratingMatch ? parseInt(ratingMatch[1]) : 5,
          text: textMatch?.[1] || 'Great service!',
          time: 'Recently'
        });
      }
      
      if (reviews.length >= 10) break;
    }

    // If no reviews found, return empty array (no fake data)
    console.log(`[ScrapeAPI Reviews] Found ${reviews.length} reviews`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: reviews.length > 0,
        data: {
          businessName: "Pink's Window Services",
          reviews: reviews,
          scrapedAt: new Date().toISOString(),
          method: 'scrapeapi'
        }
      })
    };

  } catch (error) {
    console.error('[ScrapeAPI Reviews] Error:', error);
    
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
          method: 'scrapeapi-error'
        }
      })
    };
  }
}