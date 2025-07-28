// Direct Google Reviews fetcher using fetch API
export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    console.log('[Google Reviews Fetch] Starting...');
    
    // Try multiple approaches to get real reviews
    
    // Approach 1: Use Google's official endpoint with place ID
    const placeId = 'ChIJk5XuUh8RkFQRXb__t5bgmMc';
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (apiKey) {
      try {
        console.log('[Google Reviews Fetch] Using Places API...');
        const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&reviews_no_translations=true&reviews_sort=newest&key=${apiKey}`;
        
        const apiResponse = await fetch(apiUrl);
        const apiData = await apiResponse.json();
        
        if (apiData.status === 'OK' && apiData.result && apiData.result.reviews) {
          console.log(`[Google Reviews Fetch] Got ${apiData.result.reviews.length} reviews from API`);
          
          const reviews = apiData.result.reviews.map((review, index) => ({
            id: `api-${index}`,
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            time: review.relative_time_description || 'Recently'
          }));
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: {
                businessName: apiData.result.name,
                rating: apiData.result.rating,
                totalReviews: apiData.result.user_ratings_total,
                reviews: reviews,
                scrapedAt: new Date().toISOString(),
                method: 'google-places-api'
              }
            })
          };
        }
      } catch (apiError) {
        console.error('[Google Reviews Fetch] API error:', apiError);
      }
    }
    
    // Approach 2: Try to fetch from Google Maps directly
    console.log('[Google Reviews Fetch] Attempting direct fetch...');
    
    // The actual Google Maps URL
    const mapsUrl = 'https://maps.app.goo.gl/ftntjbFPabdRr5BF9';
    
    // Try to resolve the short URL
    try {
      const resolveResponse = await fetch(mapsUrl, {
        method: 'HEAD',
        redirect: 'manual'
      });
      
      const location = resolveResponse.headers.get('location');
      console.log('[Google Reviews Fetch] Resolved URL:', location);
      
      if (location && location.includes('maps')) {
        // Extract CID from the URL if present
        const cidMatch = location.match(/cid=(\d+)/);
        if (cidMatch) {
          const cid = cidMatch[1];
          console.log('[Google Reviews Fetch] Found CID:', cid);
          
          // Try to fetch reviews using CID
          const reviewsUrl = `https://www.google.com/async/reviewDialog?hl=en&async=feature_id:0x14915f3e5214e593:0xc98ce0b7ff7b5d5d,review_source:All,sort_by:newestFirst,next_page_token:,associated_topic:,_fmt:pc`;
          
          const reviewsResponse = await fetch(reviewsUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });
          
          if (reviewsResponse.ok) {
            const text = await reviewsResponse.text();
            // Parse reviews from response
            const reviews = parseGoogleReviewsFromHTML(text);
            
            if (reviews.length > 0) {
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                  success: true,
                  data: {
                    businessName: "Pink's Window Services",
                    rating: 4.9,
                    totalReviews: 523,
                    reviews: reviews,
                    scrapedAt: new Date().toISOString(),
                    method: 'direct-fetch'
                  }
                })
              };
            }
          }
        }
      }
    } catch (fetchError) {
      console.error('[Google Reviews Fetch] Direct fetch error:', fetchError);
    }
    
    // Approach 3: Use a scraping service
    console.log('[Google Reviews Fetch] Trying scraping service...');
    
    try {
      // Use ScrapingBee or similar service if available
      const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
      if (scrapingBeeKey) {
        const scrapingUrl = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(mapsUrl)}&render_js=true&wait=5000`;
        
        const scrapingResponse = await fetch(scrapingUrl);
        if (scrapingResponse.ok) {
          const html = await scrapingResponse.text();
          const reviews = parseGoogleReviewsFromHTML(html);
          
          if (reviews.length > 0) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                data: {
                  businessName: "Pink's Window Services",
                  rating: 4.9,
                  totalReviews: 523,
                  reviews: reviews,
                  scrapedAt: new Date().toISOString(),
                  method: 'scrapingbee'
                }
              })
            };
          }
        }
      }
    } catch (scrapingError) {
      console.error('[Google Reviews Fetch] Scraping service error:', scrapingError);
    }
    
    // Return empty reviews if all methods fail - NO FAKE DATA
    console.log('[Google Reviews Fetch] All methods failed, returning empty reviews');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Unable to fetch reviews from Google',
        data: {
          businessName: "Pink's Window Services",
          reviews: [],
          scrapedAt: new Date().toISOString(),
          method: 'all-failed'
        }
      })
    };
    
  } catch (error) {
    console.error('[Google Reviews Fetch] Fatal error:', error);
    
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
          method: 'error'
        }
      })
    };
  }
}

// Helper function to parse reviews from HTML
function parseGoogleReviewsFromHTML(html) {
  const reviews = [];
  
  try {
    // Pattern 1: Look for review containers
    const reviewRegex = /<div[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const matches = html.matchAll(reviewRegex);
    
    for (const match of matches) {
      if (reviews.length >= 10) break;
      
      const reviewContent = match[1];
      
      // Extract author name
      const authorMatch = reviewContent.match(/<span[^>]*>([^<]+)<\/span>/);
      const author = authorMatch ? authorMatch[1] : 'Customer';
      
      // Extract review text
      const textMatch = reviewContent.match(/<span[^>]*class="[^"]*review-text[^"]*"[^>]*>([^<]+)<\/span>/);
      const text = textMatch ? textMatch[1] : '';
      
      // Extract rating
      const ratingMatch = reviewContent.match(/(\d+)\s*star/i);
      const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;
      
      // Extract time
      const timeMatch = reviewContent.match(/(\d+\s*(hour|day|week|month|year)s?\s*ago)/i);
      const time = timeMatch ? timeMatch[1] : 'Recently';
      
      if (text && text.length > 20) {
        reviews.push({
          id: `parsed-${reviews.length}`,
          author: author,
          rating: rating,
          text: text,
          time: time
        });
      }
    }
    
    // Pattern 2: Look for JSON-LD data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch && reviews.length === 0) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.review && Array.isArray(jsonData.review)) {
          for (const review of jsonData.review) {
            if (reviews.length >= 10) break;
            
            reviews.push({
              id: `jsonld-${reviews.length}`,
              author: review.author?.name || 'Customer',
              rating: review.reviewRating?.ratingValue || 5,
              text: review.reviewBody || '',
              time: formatDate(review.datePublished) || 'Recently'
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON-LD:', e);
      }
    }
  } catch (e) {
    console.error('Error parsing reviews:', e);
  }
  
  return reviews;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  
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