// Simple test to verify Playwright works on Netlify
import { chromium } from 'playwright-chromium';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  console.log('[Test] Starting Playwright test...');
  
  let browser = null;
  
  try {
    // Try to launch browser
    console.log('[Test] Attempting to launch Chromium...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    console.log('[Test] Browser launched! Creating page...');
    const page = await browser.newPage();
    
    console.log('[Test] Navigating to example.com...');
    await page.goto('https://example.com', { timeout: 5000 });
    
    const title = await page.title();
    console.log('[Test] Page title:', title);
    
    await browser.close();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Playwright is working!',
        title: title,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('[Test] Error:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[Test] Error closing browser:', e);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
};