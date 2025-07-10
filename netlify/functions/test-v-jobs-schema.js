import { BigQuery } from '@google-cloud/bigquery';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    });

    // Test query to get schema
    const schemaQuery = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      LIMIT 1
    `;
    
    const [rows] = await bigquery.query({ query: schemaQuery });
    
    // Get column names
    const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    // Also try a simple select to see what works
    const testQueries = [];
    
    // Test Date field variations
    for (const field of ['Date', 'date', 'DATE', 'scheduled_date', 'job_date']) {
      try {
        const testQuery = `SELECT ${field} FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` LIMIT 1`;
        await bigquery.query({ query: testQuery });
        testQueries.push({ field, status: 'exists' });
      } catch (e) {
        testQueries.push({ field, status: 'not found' });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        columnNames,
        sampleRow: rows[0] || {},
        fieldTests: testQueries
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.toString()
      })
    };
  }
};