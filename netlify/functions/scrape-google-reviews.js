export const handler = async (event, context) => {
  try {
    // The Google Maps short URL that should redirect to the full page
    const shortUrl = 'https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7';
    
    // First, follow the redirect to get the actual Google Maps URL
    const initialResponse = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'manual'
    });
    
    const actualUrl = initialResponse.headers.get('location') || shortUrl;
    console.log('Redirected to:', actualUrl);
    
    // Try to fetch the page content
    const response = await fetch(actualUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Try to extract data from the HTML
    // Note: Google Maps loads content dynamically, so this might not capture all data
    const extractedData = {
      businessName: extractBusinessName(html),
      rating: extractRating(html),
      totalReviews: extractTotalReviews(html),
      reviews: extractReviews(html),
      scrapedAt: new Date().toISOString(),
      method: 'simple-fetch',
      url: actualUrl
    };
    
    // If we couldn't extract meaningful data, provide a fallback response
    if (!extractedData.rating && !extractedData.reviews.length) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Unable to extract review data. Google Maps content is loaded dynamically and requires a headless browser.',
          suggestion: 'Consider using Puppeteer or Playwright for dynamic content scraping.',
          attemptedUrl: actualUrl,
          extractedData
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: extractedData
      })
    };
    
  } catch (error) {
    console.error('Error scraping Google reviews:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};

// Helper functions to extract data from HTML
function extractBusinessName(html) {
  // Try multiple patterns that Google might use
  const patterns = [
    /<h1[^>]*>([^<]+)<\/h1>/,
    /property="og:title" content="([^"]+)"/,
    /"name":"([^"]+)"/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractRating(html) {
  // Try to find rating patterns
  const patterns = [
    /(\d+\.?\d*)\s*star/i,
    /rating[^>]*>(\d+\.?\d*)</i,
    /"aggregateRating"[^}]*"ratingValue":"?(\d+\.?\d*)"?/,
    /data-rating="(\d+\.?\d*)"/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const rating = parseFloat(match[1]);
      if (rating >= 1 && rating <= 5) {
        return rating;
      }
    }
  }
  
  return null;
}

function extractTotalReviews(html) {
  // Try to find review count patterns
  const patterns = [
    /(\d+)\s*reviews?/i,
    /reviewCount[^>]*>(\d+)</i,
    /"reviewCount":"?(\d+)"?/,
    /\((\d+)\)\s*Google reviews/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  return null;
}

function extractReviews(html) {
  const reviews = [];
  
  // Try to find review patterns
  // Note: This is simplified and might not work with dynamic content
  const reviewPatterns = [
    /<div[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*>([\s\S]*?)<\/article>/gi
  ];
  
  for (const pattern of reviewPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const reviewHtml = match[1];
      
      // Try to extract review details
      const review = {
        text: extractReviewText(reviewHtml),
        rating: extractReviewRating(reviewHtml),
        date: extractReviewDate(reviewHtml),
        reviewerName: extractReviewerName(reviewHtml)
      };
      
      // Only add if we found meaningful content
      if (review.text || review.rating) {
        reviews.push(review);
      }
      
      // Limit to 10 reviews for now
      if (reviews.length >= 10) break;
    }
    
    if (reviews.length > 0) break;
  }
  
  return reviews;
}

function extractReviewText(html) {
  // Remove HTML tags and clean up
  const text = html.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Try to find actual review content
  if (text.length > 20 && text.length < 1000) {
    return text;
  }
  
  return null;
}

function extractReviewRating(html) {
  const patterns = [
    /(\d+)\s*star/i,
    /rating[^>]*>(\d+)</i,
    /aria-label="[^"]*(\d+)\s*star/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const rating = parseInt(match[1], 10);
      if (rating >= 1 && rating <= 5) {
        return rating;
      }
    }
  }
  
  return null;
}

function extractReviewDate(html) {
  // Try to find date patterns
  const patterns = [
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
    /(\d{4}[/-]\d{1,2}[/-]\d{1,2})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    /(\d+\s*(?:day|week|month|year)s?\s*ago)/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function extractReviewerName(html) {
  // Try to find reviewer name patterns
  const patterns = [
    /by\s+([A-Za-z\s]+?)(?:\s*\d+|<|$)/,
    /reviewer[^>]*>([^<]+)</i,
    /"author"[^}]*"name":"([^"]+)"/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 1 && name.length < 50) {
        return name;
      }
    }
  }
  
  return null;
}

