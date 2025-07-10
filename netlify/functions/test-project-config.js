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

  // Extract project info from credentials if available
  let credentialsInfo = {};
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      credentialsInfo = {
        hasCredentials: true,
        projectIdInCreds: creds.project_id || 'NOT_FOUND',
        clientEmail: creds.client_email || 'NOT_FOUND',
        privateKeyLength: creds.private_key ? creds.private_key.length : 0,
        privateKeyPreview: creds.private_key ? creds.private_key.substring(0, 50) + '...' : 'NOT_FOUND'
      };
    } catch (e) {
      credentialsInfo = {
        hasCredentials: true,
        parseError: e.message
      };
    }
  } else {
    credentialsInfo = {
      hasCredentials: false
    };
  }

  const config = {
    timestamp: new Date().toISOString(),
    environment: {
      BIGQUERY_PROJECT_ID: process.env.BIGQUERY_PROJECT_ID || 'NOT_SET',
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0,
      dataset: process.env.BIGQUERY_DATASET || 'jobber_data (default)',
      nodeVersion: process.version,
      platform: process.platform
    },
    credentialsInfo: credentialsInfo,
    expectedTables: [
      `${process.env.BIGQUERY_PROJECT_ID || 'PROJECT_ID'}.jobber_data.v_quotes`,
      `${process.env.BIGQUERY_PROJECT_ID || 'PROJECT_ID'}.jobber_data.v_jobs`,
      `${process.env.BIGQUERY_PROJECT_ID || 'PROJECT_ID'}.jobber_data.v_requests`,
      `${process.env.BIGQUERY_PROJECT_ID || 'PROJECT_ID'}.jobber_data.google_reviews`
    ],
    configurationChecks: {
      projectIdSet: !!process.env.BIGQUERY_PROJECT_ID,
      credentialsSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      projectIdsMatch: false
    }
  };

  // Check if project IDs match
  if (credentialsInfo.projectIdInCreds && process.env.BIGQUERY_PROJECT_ID) {
    config.configurationChecks.projectIdsMatch = credentialsInfo.projectIdInCreds === process.env.BIGQUERY_PROJECT_ID;
    if (!config.configurationChecks.projectIdsMatch) {
      config.warning = `Project ID mismatch: Environment says '${process.env.BIGQUERY_PROJECT_ID}' but credentials say '${credentialsInfo.projectIdInCreds}'`;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(config, null, 2),
  };
};