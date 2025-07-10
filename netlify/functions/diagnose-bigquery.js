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

  const diagnostics = {
    timestamp: new Date().toISOString(),
    step1_environment: {},
    step2_credentials: {},
    step3_connection: {},
    step4_dataset: {},
    step5_tables: {},
    step6_testQuery: {},
    recommendations: []
  };

  try {
    // Step 1: Check environment variables
    diagnostics.step1_environment = {
      hasProjectId: !!process.env.BIGQUERY_PROJECT_ID,
      projectId: process.env.BIGQUERY_PROJECT_ID || 'NOT_SET',
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0,
      status: 'checking'
    };

    if (!process.env.BIGQUERY_PROJECT_ID) {
      diagnostics.step1_environment.status = 'failed';
      diagnostics.step1_environment.error = 'BIGQUERY_PROJECT_ID is not set';
      diagnostics.recommendations.push('Set BIGQUERY_PROJECT_ID in Netlify environment variables');
      throw new Error('Missing BIGQUERY_PROJECT_ID');
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      diagnostics.step1_environment.status = 'failed';
      diagnostics.step1_environment.error = 'GOOGLE_APPLICATION_CREDENTIALS_JSON is not set';
      diagnostics.recommendations.push('Set GOOGLE_APPLICATION_CREDENTIALS_JSON in Netlify environment variables');
      throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }

    diagnostics.step1_environment.status = 'passed';

    // Step 2: Parse and validate credentials
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      diagnostics.step2_credentials = {
        status: 'passed',
        type: credentials.type || 'missing',
        hasPrivateKey: !!credentials.private_key,
        privateKeyLength: credentials.private_key?.length || 0,
        hasClientEmail: !!credentials.client_email,
        clientEmail: credentials.client_email || 'missing',
        projectIdInCreds: credentials.project_id || 'missing',
        matchesEnvProjectId: credentials.project_id === process.env.BIGQUERY_PROJECT_ID
      };

      if (!credentials.private_key) {
        diagnostics.step2_credentials.status = 'failed';
        diagnostics.step2_credentials.error = 'Missing private_key in credentials';
        diagnostics.recommendations.push('Ensure the service account JSON contains a private_key field');
      }

      if (!diagnostics.step2_credentials.matchesEnvProjectId) {
        diagnostics.step2_credentials.warning = 'Project ID in credentials does not match BIGQUERY_PROJECT_ID';
        diagnostics.recommendations.push('Ensure BIGQUERY_PROJECT_ID matches the project_id in your service account JSON');
      }
    } catch (e) {
      diagnostics.step2_credentials = {
        status: 'failed',
        error: 'Failed to parse credentials JSON',
        parseError: e.message,
        hint: 'Make sure GOOGLE_APPLICATION_CREDENTIALS_JSON is valid JSON on a single line'
      };
      diagnostics.recommendations.push('Fix the JSON format of GOOGLE_APPLICATION_CREDENTIALS_JSON');
      throw new Error('Invalid credentials JSON: ' + e.message);
    }

    // Step 3: Initialize BigQuery client
    let bigquery;
    try {
      bigquery = new BigQuery({
        projectId: process.env.BIGQUERY_PROJECT_ID,
        credentials: credentials
      });
      diagnostics.step3_connection.status = 'passed';
      diagnostics.step3_connection.message = 'BigQuery client initialized successfully';
    } catch (e) {
      diagnostics.step3_connection = {
        status: 'failed',
        error: 'Failed to initialize BigQuery client',
        details: e.message
      };
      throw e;
    }

    // Step 4: Test basic query
    try {
      const testQuery = 'SELECT 1 as test';
      const [rows] = await bigquery.query({
        query: testQuery,
        timeoutMs: 5000
      });
      diagnostics.step4_dataset.status = 'passed';
      diagnostics.step4_dataset.message = 'Basic query successful';
      diagnostics.step4_dataset.result = rows[0];
    } catch (e) {
      diagnostics.step4_dataset = {
        status: 'failed',
        error: 'Failed to execute basic query',
        details: e.message,
        hint: 'This usually indicates authentication or permission issues'
      };
      diagnostics.recommendations.push('Grant BigQuery Data Viewer and BigQuery Job User roles to the service account');
      throw e;
    }

    // Step 5: Check dataset and tables
    try {
      const dataset = bigquery.dataset('jobber_data');
      const [exists] = await dataset.exists();
      
      if (!exists) {
        diagnostics.step5_tables = {
          status: 'failed',
          error: 'Dataset jobber_data does not exist',
          projectId: process.env.BIGQUERY_PROJECT_ID
        };
        diagnostics.recommendations.push('Create the jobber_data dataset in BigQuery or check if it has a different name');
      } else {
        const [tables] = await dataset.getTables();
        const tableNames = tables.map(t => t.id);
        
        const requiredTables = ['v_quotes', 'v_jobs', 'v_requests', 'google_reviews'];
        const missingTables = requiredTables.filter(t => !tableNames.includes(t));
        
        diagnostics.step5_tables = {
          status: missingTables.length === 0 ? 'passed' : 'warning',
          datasetExists: true,
          tablesFound: tableNames,
          requiredTables: requiredTables,
          missingTables: missingTables
        };
        
        if (missingTables.length > 0) {
          diagnostics.recommendations.push(`Create or check the following tables/views: ${missingTables.join(', ')}`);
        }
      }
    } catch (e) {
      diagnostics.step5_tables = {
        status: 'failed',
        error: 'Failed to check dataset/tables',
        details: e.message
      };
    }

    // Step 6: Test actual query from dashboard
    try {
      const testDashboardQuery = `
        SELECT COUNT(*) as quote_count
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
        WHERE sent_date >= '2025-03-01'
        LIMIT 1
      `;
      
      const [rows] = await bigquery.query({
        query: testDashboardQuery,
        timeoutMs: 5000
      });
      
      diagnostics.step6_testQuery = {
        status: 'passed',
        message: 'Dashboard query successful',
        quoteCount: rows[0].quote_count
      };
    } catch (e) {
      diagnostics.step6_testQuery = {
        status: 'failed',
        error: 'Failed to execute dashboard query',
        details: e.message,
        query: 'SELECT COUNT(*) FROM v_quotes'
      };
      
      if (e.message.includes('not found')) {
        diagnostics.recommendations.push('Check if v_quotes table/view exists and has the correct schema');
      }
    }

    // Summary
    const allPassed = Object.keys(diagnostics)
      .filter(key => key.startsWith('step'))
      .every(key => diagnostics[key].status === 'passed');

    diagnostics.summary = {
      allTestsPassed: allPassed,
      recommendation: allPassed 
        ? 'All tests passed! The dashboard should be working.' 
        : 'Fix the issues identified above, then redeploy.'
    };

  } catch (error) {
    diagnostics.fatalError = {
      message: error.message,
      stack: error.stack
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(diagnostics, null, 2),
  };
};