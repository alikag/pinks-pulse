// Extract the real place_id from the Google Maps URL
export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // The shortened URL provided by the user
    const shortUrl = 'https://maps.app.goo.gl/ftntjbFPabdRr5BF9';
    
    console.log('[Extract Place ID] Following redirect from:', shortUrl);
    
    // Follow the redirect to get the full URL
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'manual'
    });
    
    const location = response.headers.get('location');
    console.log('[Extract Place ID] Redirects to:', location);
    
    // Extract place information from the URL
    let placeInfo = {
      shortUrl: shortUrl,
      fullUrl: location,
      extracted: {}
    };
    
    if (location) {
      // Try to extract CID (Customer ID)
      const cidMatch = location.match(/cid=(\d+)/);
      if (cidMatch) {
        placeInfo.extracted.cid = cidMatch[1];
      }
      
      // Try to extract place_id from data parameter
      const dataMatch = location.match(/data=([^&]+)/);
      if (dataMatch) {
        placeInfo.extracted.dataParam = dataMatch[1];
        
        // Decode the data parameter
        try {
          const decoded = decodeURIComponent(dataMatch[1]);
          placeInfo.extracted.decodedData = decoded;
          
          // Look for patterns that might contain place_id
          const placeIdMatch = decoded.match(/[A-Za-z0-9_-]{27}/);
          if (placeIdMatch) {
            placeInfo.extracted.possiblePlaceId = placeIdMatch[0];
          }
        } catch (e) {
          placeInfo.extracted.decodeError = e.message;
        }
      }
      
      // Try to extract coordinates
      const coordMatch = location.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        placeInfo.extracted.coordinates = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        };
      }
      
      // Try alternative approach - fetch the page content
      try {
        const pageResponse = await fetch(location || shortUrl);
        const html = await pageResponse.text();
        
        // Look for place_id in the HTML
        const placeIdInHtml = html.match(/place_id[":]*([A-Za-z0-9_-]{27})/);
        if (placeIdInHtml) {
          placeInfo.extracted.placeIdFromHtml = placeIdInHtml[1];
        }
        
        // Look for data-pid attribute
        const pidMatch = html.match(/data-pid="([^"]+)"/);
        if (pidMatch) {
          placeInfo.extracted.dataPid = pidMatch[1];
        }
        
        // Look for ftid parameter
        const ftidMatch = html.match(/ftid=([^&"]+)/);
        if (ftidMatch) {
          placeInfo.extracted.ftid = ftidMatch[1];
        }
        
        // Extract business name
        const nameMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
        if (nameMatch) {
          placeInfo.extracted.businessName = nameMatch[1];
        }
      } catch (e) {
        placeInfo.extracted.htmlFetchError = e.message;
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(placeInfo, null, 2)
    };
    
  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
}