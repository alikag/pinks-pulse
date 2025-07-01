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

    // Simple queries to get ALL data
    const quotesQuery = `
      SELECT 
        quote_number,
        client_name,
        salesperson,
        status,
        total_dollars,
        created_at,
        updated_at,
        sent_date,
        approved_date,
        converted_date,
        days_to_convert
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const jobsQuery = `
      SELECT 
        Job_Number,
        Client_name,
        Date,
        Calculated_Value,
        Job_Status,
        SalesPerson,
        Date_Converted
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      ORDER BY Date DESC
      LIMIT 100
    `;

    // Run both queries
    const [quotesResult, jobsResult] = await Promise.all([
      bigquery.query(quotesQuery),
      bigquery.query(jobsQuery)
    ]);

    const quotesData = quotesResult[0];
    const jobsData = jobsResult[0];

    console.log(`Found ${quotesData.length} quotes and ${jobsData.length} jobs`);

    // Return ALL data without any filtering
    const data = {
      summary: {
        totalQuotes: quotesData.length,
        totalJobs: jobsData.length,
        quotesWithSentDate: quotesData.filter(q => q.sent_date !== null).length,
        quotesWithConvertedDate: quotesData.filter(q => q.converted_date !== null).length,
        jobsWithDate: jobsData.filter(j => j.Date !== null).length,
      },
      quotes: {
        sample: quotesData.slice(0, 10),
        statusCounts: quotesData.reduce((acc, q) => {
          acc[q.status] = (acc[q.status] || 0) + 1;
          return acc;
        }, {}),
        totalValue: quotesData.reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0),
      },
      jobs: {
        sample: jobsData.slice(0, 10),
        totalValue: jobsData.reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0),
      },
      lastUpdated: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    console.error('BigQuery error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        lastUpdated: new Date().toISOString()
      }, null, 2),
    };
  }
};