// Simple Google Reviews scraper - no API keys required
export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    console.log('[Simple Reviews] Starting...');
    
    // The Google Maps URL for Pink's Window Services
    const googleMapsUrl = 'https://maps.app.goo.gl/ftntjbFPabdRr5BF9';
    
    // Use a CORS proxy to fetch the page
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleMapsUrl)}`;
    
    console.log('[Simple Reviews] Fetching via proxy...');
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();
    const html = data.contents || '';
    
    // Extract reviews from the HTML using regex patterns
    const reviews = [];
    
    // Try to find review data in JSON-LD format (Google often includes this)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        
        // Extract business info
        const businessName = jsonData.name || "Pink's Window Services";
        const rating = jsonData.aggregateRating?.ratingValue || 0;
        const totalReviews = jsonData.aggregateRating?.reviewCount || 0;
        
        // Extract individual reviews if present
        if (jsonData.review && Array.isArray(jsonData.review)) {
          jsonData.review.forEach((review, index) => {
            if (index < 10) { // Limit to 10 reviews
              reviews.push({
                id: `simple-${index}`,
                author: review.author?.name || 'Customer',
                rating: review.reviewRating?.ratingValue || 5,
                text: review.reviewBody || '',
                time: review.datePublished ? formatDate(review.datePublished) : 'Recently'
              });
            }
          });
        }
        
        console.log(`[Simple Reviews] Found ${reviews.length} reviews in JSON-LD`);
        
        if (reviews.length > 0) {
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
                method: 'simple-jsonld'
              }
            })
          };
        }
      } catch (e) {
        console.error('[Simple Reviews] Failed to parse JSON-LD:', e);
      }
    }
    
    // Fallback: Try to extract reviews from HTML patterns
    // Look for review patterns in the HTML
    const reviewPatterns = [
      /<div[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<span[^>]*class="[^"]*review-text[^"]*"[^>]*>([^<]+)<\/span>/gi
    ];
    
    for (const pattern of reviewPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (reviews.length >= 10) break;
        
        const reviewText = match[1].replace(/<[^>]*>/g, '').trim();
        if (reviewText && reviewText.length > 20 && reviewText.length < 1000) {
          reviews.push({
            id: `simple-${reviews.length}`,
            author: 'Customer',
            rating: 5,
            text: reviewText,
            time: 'Recently'
          });
        }
      }
    }
    
    console.log(`[Simple Reviews] Found ${reviews.length} reviews total`);
    
    // If we still have no reviews, return empty array (no fake data)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: reviews.length > 0,
        data: {
          businessName: "Pink's Window Services",
          reviews: reviews,
          scrapedAt: new Date().toISOString(),
          method: 'simple-proxy'
        }
      })
    };

  } catch (error) {
    console.error('[Simple Reviews] Error:', error);
    
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
          method: 'simple-error'
        }
      })
    };
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}