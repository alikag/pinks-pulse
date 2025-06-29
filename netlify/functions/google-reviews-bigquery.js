const { BigQuery } = require('@google-cloud/bigquery');

exports.handler = async (event, context) => {
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
    // Initialize BigQuery
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: credentials
    });

    // Query for reviews from BigQuery
    // First, let's check if the table exists
    const dataset = bigquery.dataset(process.env.BIGQUERY_DATASET || 'jobber_data');
    const [tables] = await dataset.getTables();
    const reviewsTableExists = tables.some(table => table.id === 'google_reviews');

    let reviews = [];
    let businessInfo = {
      name: "Pink's Windows Hudson Valley",
      rating: 4.8,
      totalReviews: 127
    };

    if (reviewsTableExists) {
      // If table exists, query real reviews
      const query = `
        SELECT 
          author_name,
          rating,
          text,
          time,
          created_at
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.google_reviews\`
        ORDER BY created_at DESC
        LIMIT 10
      `;

      try {
        const [rows] = await bigquery.query(query);
        reviews = rows.map(row => ({
          reviewerName: row.author_name,
          rating: row.rating,
          text: row.text,
          date: row.time || 'Recently'
        }));

        // Calculate average rating
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
          businessInfo.rating = (totalRating / reviews.length).toFixed(1);
          businessInfo.totalReviews = reviews.length;
        }
      } catch (queryError) {
        console.log('Reviews table query failed:', queryError.message);
      }
    }

    // If no reviews found, return empty array

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
          source: reviewsTableExists ? 'bigquery' : 'no_table',
          message: reviewsTableExists ? 'Reviews from BigQuery' : 'No reviews table found - create google_reviews table in BigQuery',
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