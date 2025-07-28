import { chromium } from 'playwright-chromium';

export const handler = async (event, context) => {
  let browser = null;
  
  console.log('[Scraper] Starting Google Reviews scraper...');
  console.log('[Scraper] Function timeout:', context.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() : 'Unknown');
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }
  
  try {
    // Launch browser
    console.log('[Scraper] Launching Chromium browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('[Scraper] Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('[Scraper] New page created');
    
    // Set user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Navigate to the URL
    const url = 'https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7';
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 8000 // Reduced to fit within Netlify's 10-second limit
    });
    
    // Wait for content to load (reduced for Netlify)
    await page.waitForTimeout(1500);
    
    // Try to click on "More reviews" button if available
    try {
      const moreReviewsButton = await page.locator('button:has-text("More reviews")').first();
      if (await moreReviewsButton.isVisible()) {
        await moreReviewsButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('No "More reviews" button found or clickable');
    }
    
    // Extract data
    const data = await page.evaluate(() => {
      const result = {
        businessName: null,
        rating: null,
        totalReviews: null,
        reviews: []
      };
      
      // Business name - try multiple selectors
      const nameSelectors = [
        'h1[class*="fontHeadlineLarge"]',
        'h1[class*="DUwDvf"]',
        'h1[aria-label]',
        'div[class*="SPZz6b"] h1',
        'h1'
      ];
      
      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          result.businessName = element.textContent.trim();
          break;
        }
      }
      
      // Rating - try multiple approaches
      const ratingSelectors = [
        'div[class*="F7nice"] span[aria-label*="star"]',
        'div[jsaction*="pane.rating"] span[aria-label*="star"]',
        'span[class*="MW4etd"]',
        'div[class*="fontDisplayLarge"]'
      ];
      
      for (const selector of ratingSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.getAttribute('aria-label') || element.textContent;
          const match = text.match(/(\d+\.?\d*)/);
          if (match) {
            result.rating = parseFloat(match[1]);
            break;
          }
        }
      }
      
      // Total reviews
      const reviewCountSelectors = [
        'button[jsaction*="pane.reviewChart"] span',
        'button[aria-label*="reviews"]',
        'span:has-text("reviews")',
        'div[class*="F7nice"] span[aria-label*="reviews"]'
      ];
      
      for (const selector of reviewCountSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.getAttribute('aria-label') || element.textContent;
            const match = text.match(/(\d+)\s*reviews?/i);
            if (match) {
              result.totalReviews = parseInt(match[1], 10);
              break;
            }
          }
          if (result.totalReviews) break;
        } catch (e) {}
      }
      
      // Reviews - try multiple selectors
      const reviewSelectors = [
        'div[data-review-id]',
        'div[jsaction*="pane.review"]',
        'div[class*="jftiEf"]',
        'div[class*="section-review"]'
      ];
      
      let reviewElements = [];
      for (const selector of reviewSelectors) {
        reviewElements = document.querySelectorAll(selector);
        if (reviewElements.length > 0) break;
      }
      
      reviewElements.forEach((reviewEl, index) => {
        if (index >= 10) return; // Limit to 10 reviews
        
        const review = {
          text: null,
          rating: null,
          date: null,
          reviewerName: null
        };
        
        // Reviewer name
        const nameSelectors = [
          'div[class*="d4r55"]',
          'button[class*="section-review-owner"]',
          'div[class*="fontTitleSmall"]',
          'a[class*="WNBkOb"]'
        ];
        
        for (const selector of nameSelectors) {
          const nameEl = reviewEl.querySelector(selector);
          if (nameEl && nameEl.textContent.trim()) {
            review.reviewerName = nameEl.textContent.trim();
            break;
          }
        }
        
        // Review rating
        const ratingSelectors = [
          'span[class*="kvMYJc"]',
          'span[aria-label*="star"]',
          'span[class*="section-review-stars"]'
        ];
        
        for (const selector of ratingSelectors) {
          const ratingEl = reviewEl.querySelector(selector);
          if (ratingEl) {
            const ariaLabel = ratingEl.getAttribute('aria-label') || '';
            const match = ariaLabel.match(/(\d+)\s*star/i);
            if (match) {
              review.rating = parseInt(match[1], 10);
              break;
            }
          }
        }
        
        // Review text
        const textSelectors = [
          'span[class*="wiI7pd"]',
          'div[class*="MyEned"]',
          'span[class*="section-review-text"]',
          'div[jsaction*="review.expandText"]'
        ];
        
        for (const selector of textSelectors) {
          const textEl = reviewEl.querySelector(selector);
          if (textEl && textEl.textContent.trim()) {
            review.text = textEl.textContent.trim();
            break;
          }
        }
        
        // Review date
        const dateSelectors = [
          'span[class*="rsqaWe"]',
          'span[class*="section-review-publish-date"]',
          'span:has-text("ago")'
        ];
        
        for (const selector of dateSelectors) {
          const dateEl = reviewEl.querySelector(selector);
          if (dateEl && dateEl.textContent.trim()) {
            review.date = dateEl.textContent.trim();
            break;
          }
        }
        
        // Only add if we have meaningful content
        if (review.text || review.rating) {
          result.reviews.push(review);
        }
      });
      
      return result;
    });
    
    const finalUrl = page.url();
    await browser.close();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          ...data,
          scrapedAt: new Date().toISOString(),
          method: 'playwright',
          url: finalUrl
        }
      })
    };
    
  } catch (error) {
    console.error('[Scraper] Error scraping with Playwright:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    if (browser) {
      await browser.close();
    }
    
    // Check if it's a browser launch error
    const isBrowserError = error.message.includes('chromium') || 
                         error.message.includes('launch') || 
                         error.message.includes('executable') ||
                         error.message.includes('Failed to launch');
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorType: isBrowserError ? 'BROWSER_LAUNCH_FAILED' : 'SCRAPING_ERROR',
        suggestion: isBrowserError 
          ? 'Playwright may not work on Netlify Free tier. Use simple scraper as fallback.'
          : 'Check logs for details. The scraper may need updating.',
        timestamp: new Date().toISOString()
      })
    };
  }
};