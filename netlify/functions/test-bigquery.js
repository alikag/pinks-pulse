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
    // Initialize BigQuery
    let bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }

    const bigquery = new BigQuery(bigqueryConfig);

    // Simple test queries - no date filtering
    const quotesQuery = `
      SELECT COUNT(*) as total_quotes
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
    `;

    const jobsQuery = `
      SELECT COUNT(*) as total_jobs
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
    `;

    // Get recent samples
    const sampleQuotesQuery = `
      SELECT 
        quote_number,
        client_name,
        status,
        total_dollars,
        created_at,
        sent_date,
        converted_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE created_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const sampleJobsQuery = `
      SELECT 
        Job_Number,
        Client_name,
        Date,
        Calculated_Value,
        Job_Status
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE Date IS NOT NULL
      ORDER BY Date DESC
      LIMIT 5
    `;

    // Run all queries
    const [quotesCount, jobsCount, sampleQuotes, sampleJobs] = await Promise.all([
      bigquery.query(quotesQuery),
      bigquery.query(jobsQuery),
      bigquery.query(sampleQuotesQuery),
      bigquery.query(sampleJobsQuery)
    ]);

    const data = {
      counts: {
        quotes: quotesCount[0][0].total_quotes,
        jobs: jobsCount[0][0].total_jobs
      },
      samples: {
        quotes: sampleQuotes[0],
        jobs: sampleJobs[0]
      },
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    console.error('BigQuery test error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2),
    };
  }
};