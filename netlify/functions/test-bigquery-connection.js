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
    environment: {
      hasProjectId: !!process.env.BIGQUERY_PROJECT_ID,
      projectId: process.env.BIGQUERY_PROJECT_ID ? 'Set (hidden)' : 'Not set',
      hasDataset: !!process.env.BIGQUERY_DATASET,
      dataset: process.env.BIGQUERY_DATASET || 'Not set',
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0,
      hasGoogleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
      hasGooglePlaceId: !!process.env.GOOGLE_PLACE_ID,
      placeId: process.env.GOOGLE_PLACE_ID || 'Not set'
    },
    credentialsCheck: {
      isValid: false,
      error: null,
      details: {}
    },
    bigqueryTest: {
      connected: false,
      error: null
    }
  };

  // Check if credentials are valid JSON
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      results.credentialsCheck.isValid = true;
      results.credentialsCheck.details = {
        hasType: !!creds.type,
        type: creds.type || 'Not found',
        hasProjectId: !!creds.project_id,
        hasPrivateKey: !!creds.private_key,
        privateKeyLength: creds.private_key ? creds.private_key.length : 0,
        hasClientEmail: !!creds.client_email,
        clientEmail: creds.client_email ? creds.client_email.substring(0, 20) + '...' : 'Not found'
      };
    } catch (e) {
      results.credentialsCheck.error = e.message;
      results.credentialsCheck.details = {
        error: 'Failed to parse JSON',
        hint: 'Make sure the credentials are valid JSON format'
      };
    }
  } else {
    results.credentialsCheck.error = 'No credentials found';
  }

  // Try to initialize BigQuery
  if (results.credentialsCheck.isValid) {
    try {
      // BigQuery already imported at the top
      
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      const bigquery = new BigQuery({
        projectId: process.env.BIGQUERY_PROJECT_ID,
        credentials: credentials
      });

      // Try a simple query
      const query = `SELECT 1 as test`;
      const [rows] = await bigquery.query(query);
      
      results.bigqueryTest.connected = true;
      results.bigqueryTest.testQuery = 'SELECT 1 returned successfully';
      
      // Try to list tables
      try {
        const dataset = bigquery.dataset(process.env.BIGQUERY_DATASET || 'jobber_data');
        const [tables] = await dataset.getTables();
        results.bigqueryTest.tables = tables.map(t => t.id).slice(0, 10); // First 10 tables
        results.bigqueryTest.tableCount = tables.length;
      } catch (tableError) {
        results.bigqueryTest.tableError = tableError.message;
      }
      
    } catch (e) {
      results.bigqueryTest.error = e.message;
      results.bigqueryTest.stack = e.stack;
    }
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