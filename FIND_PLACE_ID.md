# How to Find Your Google Place ID

## From your Google Maps URL: https://maps.app.goo.gl/zjLKMB1RRS6TqBe18

### Method 1: Browser URL Bar
1. Click on the link: https://maps.app.goo.gl/zjLKMB1RRS6TqBe18
2. Wait for it to load completely
3. Look at your browser's URL bar - it should expand to show a longer URL
4. Find the Place ID in the URL - it starts with "ChIJ" and is about 27 characters long
5. Example: `ChIJN1t_tDeuEmsRUsoyG83frY4`

### Method 2: Page Source
1. Visit the Google Maps page
2. Right-click and select "View Page Source" 
3. Search (Ctrl+F) for "ChIJ"
4. You'll find your Place ID

### Method 3: Google Places API Explorer
1. Visit: https://developers.google.com/maps/documentation/places/web-service/place-id
2. Use their Place ID Finder tool
3. Search for "Pink's Windows Hudson Valley"

### Once You Have the Place ID:
1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Add new variable:
   - Key: `GOOGLE_PLACE_ID`
   - Value: `ChIJ...` (your full Place ID)
4. Deploy or trigger rebuild

Your Google Reviews will then load automatically!