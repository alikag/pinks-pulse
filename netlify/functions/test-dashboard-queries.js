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

  const results = {
    timestamp: new Date().toISOString(),
    queries: {}
  };

  try {
    // Initialize BigQuery
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: credentials
    });

    // Test each query individually
    const testQueries = {
      checkVQuotes: `SELECT COUNT(*) as count FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` LIMIT 1`,
      checkVRequests: `SELECT COUNT(*) as count FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` LIMIT 1`,
      checkVJobs: `SELECT COUNT(*) as count FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` LIMIT 1`,
      sampleQuote: `SELECT quote_number, sent_date, status FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` LIMIT 1`,
      testDateParsing: `SELECT 
        sent_date,
        CAST(sent_date AS STRING) as sent_date_string,
        DATE(sent_date) as sent_date_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` 
      WHERE sent_date IS NOT NULL 
      LIMIT 1`
    };

    for (const [name, query] of Object.entries(testQueries)) {
      try {
        console.log(`Running ${name}...`);
        const [rows] = await bigquery.query(query);
        results.queries[name] = {
          success: true,
          rowCount: rows.length,
          data: rows
        };
      } catch (error) {
        results.queries[name] = {
          success: false,
          error: error.message
        };
      }
    }

    // Try the actual speed to lead query
    try {
      const speedToLeadQuery = `
        WITH speed_data AS (
          SELECT 
            r.quote_number,
            r.requested_on_date,
            q.sent_date,
            q.salesperson,
            TIMESTAMP_DIFF(
              CAST(q.sent_date AS TIMESTAMP), 
              CAST(r.requested_on_date AS TIMESTAMP), 
              MINUTE
            ) as minutes_to_quote
          FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
          INNER JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
            ON r.quote_number = q.quote_number
          WHERE r.requested_on_date IS NOT NULL 
            AND q.sent_date IS NOT NULL
            AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          LIMIT 5
        )
        SELECT * FROM speed_data
      `;
      
      const [speedRows] = await bigquery.query(speedToLeadQuery);
      results.queries.speedToLead = {
        success: true,
        rowCount: speedRows.length,
        data: speedRows
      };
    } catch (error) {
      results.queries.speedToLead = {
        success: false,
        error: error.message
      };
    }

  } catch (error) {
    results.error = error.message;
    results.stack = error.stack;
  }

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(results, null, 2)
  };
};