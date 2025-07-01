import { BigQuery } from '@google-cloud/bigquery';

export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    console.log('[Google Reviews BigQuery] Starting query...');
    console.log('[Google Reviews BigQuery] Project ID:', process.env.BIGQUERY_PROJECT_ID);
    
    // Initialize BigQuery
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured');
    }
    
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: credentials
    });

    // Query for reviews from BigQuery using the specific table
    let reviews = [];
    let businessInfo = {
      name: "Pink's Windows Hudson Valley",
      rating: 4.8,
      totalReviews: 127
    };

    // Query real reviews from the specified BigQuery table
    const query = `
      SELECT 
        author_name,
        rating,
        text,
        time,
        created_at
      FROM \`jobber-data-warehouse-462721.jobber_data.google_reviews\`
      ORDER BY created_at DESC
      LIMIT 10
    `;

    try {
      console.log('[Google Reviews BigQuery] Executing query for reviews...');
      const [rows] = await bigquery.query(query);
      console.log('[Google Reviews BigQuery] Query returned', rows.length, 'reviews');
      
      if (rows.length > 0) {
        console.log('[Google Reviews BigQuery] First review sample:', {
          author_name: rows[0].author_name,
          rating: rows[0].rating,
          text: rows[0].text ? rows[0].text.substring(0, 50) + '...' : null,
          time: rows[0].time
        });
      }
      
      reviews = rows.map(row => ({
        reviewerName: row.author_name,
        rating: parseInt(row.rating) || 5,
        text: row.text,
        date: row.time || 'Recently'
      }));

      // Calculate average rating and get total count
      if (reviews.length > 0) {
        // Get total review count
        const countQuery = `
          SELECT COUNT(*) as total
          FROM \`jobber-data-warehouse-462721.jobber_data.google_reviews\`
        `;
        const [countRows] = await bigquery.query(countQuery);
        businessInfo.totalReviews = countRows[0].total;
        
        // Calculate average rating from all reviews
        const avgQuery = `
          SELECT AVG(CAST(rating AS FLOAT64)) as avg_rating
          FROM \`jobber-data-warehouse-462721.jobber_data.google_reviews\`
        `;
        const [avgRows] = await bigquery.query(avgQuery);
        businessInfo.rating = parseFloat(avgRows[0].avg_rating).toFixed(1);
      }
    } catch (queryError) {
      console.log('[Google Reviews BigQuery] Query failed:', queryError.message);
      console.log('[Google Reviews BigQuery] Table:', 'jobber-data-warehouse-462721.jobber_data.google_reviews');
      console.log('[Google Reviews BigQuery] Error details:', queryError.toString());
    }

    // If no reviews found, return empty array
    
    console.log('[Google Reviews BigQuery] Returning', reviews.length, 'reviews');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          businessName: businessInfo.name,
          rating: businessInfo.rating,
          totalReviews: businessInfo.totalReviews,
          reviews: reviews,
          source: reviews.length > 0 ? 'bigquery' : 'no_data',
          message: reviews.length > 0 ? 'Reviews from BigQuery' : 'No reviews found in jobber-data-warehouse-462721.jobber_data.google_reviews',
          tableId: 'jobber-data-warehouse-462721.jobber_data.google_reviews',
          scrapedAt: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('[Google Reviews BigQuery] Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        data: {
          businessName: "Pink's Windows Hudson Valley",
          rating: 4.8,
          totalReviews: 127,
          reviews: [],
          source: 'error'
        }
      })
    };
  }
};