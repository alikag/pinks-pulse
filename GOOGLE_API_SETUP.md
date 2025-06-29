# Google API Key Setup Guide

## IMPORTANT: Never commit API keys to code!

## New API Key Available - Add to Netlify Environment Variables Only!

### Steps to Set Up Google Maps API Key Securely:

1. **Regenerate Your API Key** (Since it was exposed):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to APIs & Services > Credentials
   - Find the exposed key and click "REGENERATE KEY"
   - Copy the new key

2. **Add API Key Restrictions**:
   - Click on your API key
   - Under "Application restrictions", select "HTTP referrers"
   - Add these referrers:
     - `https://pinkspulse.netlify.app/*`
     - `https://*.netlify.app/*` (for preview deploys)
   - Under "API restrictions", select "Restrict key"
   - Enable only: Places API, Maps JavaScript API

3. **Add to Netlify Environment Variables**:
   - Go to Netlify Dashboard
   - Site settings > Environment variables
   - Add new variable:
     - Key: `GOOGLE_MAPS_API_KEY`
     - Value: [Add your API key in Netlify only - NEVER in code]
   - Deploy or trigger a new build
   
   **DO NOT put the API key in any code files!**

4. **Never Put API Keys in Code**:
   - Always use environment variables
   - Add `.env` to `.gitignore`
   - Use `process.env.GOOGLE_MAPS_API_KEY` in code

### Testing Locally:
Create a `.env` file (never commit this!):
```
GOOGLE_MAPS_API_KEY=your-new-api-key-here
```

### Additional Security:
- Enable billing alerts in Google Cloud Console
- Monitor API usage regularly
- Use separate API keys for development and production