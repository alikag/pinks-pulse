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

  // Return environment status (without exposing sensitive data)
  const status = {
    hasProjectId: !!process.env.BIGQUERY_PROJECT_ID,
    projectIdLength: process.env.BIGQUERY_PROJECT_ID?.length || 0,
    hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    context: process.env.CONTEXT,
    isNetlify: !!process.env.NETLIFY,
    timestamp: new Date().toISOString()
  };

  // Try to parse credentials to check if valid JSON
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      status.credentialsValid = true;
      status.credentialsType = creds.type || 'unknown';
      status.hasPrivateKey = !!creds.private_key;
      status.projectIdFromCreds = creds.project_id ? 'present' : 'missing';
    } catch (e) {
      status.credentialsValid = false;
      status.credentialsError = e.message;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(status, null, 2),
  };
};