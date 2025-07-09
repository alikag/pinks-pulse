# Troubleshooting Dashboard 500 Error

## Current Issue
The dashboard is showing a 500 error when trying to fetch data from `/.netlify/functions/dashboard-data-sales`.

## Quick Diagnosis Steps

### 1. Test Environment Variables
Visit this URL in your browser:
```
https://pinkspulse.netlify.app/.netlify/functions/dashboard-data-sales/test
```

This should return:
```json
{
  "message": "Test endpoint working",
  "timestamp": "2025-07-09T...",
  "env": {
    "hasProjectId": true,
    "projectId": "your-project-id"
  }
}
```

If `hasProjectId` is `false`, the `BIGQUERY_PROJECT_ID` environment variable is missing.

### 2. Check Netlify Environment Variables

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (pinkspulse)
3. Go to Site settings → Environment variables
4. Verify these variables exist:

#### Required Variables:
- `BIGQUERY_PROJECT_ID` - Your Google Cloud project ID (e.g., "pinks-dashboard-123456")
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - The full service account JSON as a single line

### 3. Format Service Account JSON Correctly

The `GOOGLE_APPLICATION_CREDENTIALS_JSON` must be a single-line string. Here's how to format it:

1. Take your service account JSON file
2. Remove all line breaks and extra spaces
3. It should look like this:
```
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### 4. Common Fixes

#### Fix 1: Missing Environment Variables
```bash
# In Netlify UI, add:
BIGQUERY_PROJECT_ID = your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS_JSON = {paste single-line JSON here}
```

#### Fix 2: Malformed JSON
- Use a JSON validator to check your credentials
- Ensure no quotes around the JSON value in Netlify
- Make sure it's all on one line

#### Fix 3: Permission Issues
Ensure your service account has these roles in Google Cloud:
- BigQuery Data Viewer
- BigQuery Job User

### 5. Check Function Logs

1. Go to Netlify Dashboard → Functions
2. Click on `dashboard-data-sales`
3. Check recent invocations for error messages
4. Look for messages starting with `[dashboard-data-sales]`

### 6. Test BigQuery Connection Locally

Create a file `test-connection.js`:
```javascript
const { BigQuery } = require('@google-cloud/bigquery');

// Use your actual values
process.env.BIGQUERY_PROJECT_ID = 'your-project-id';
process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = '{your-json}';

async function test() {
  try {
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    });
    
    const query = `SELECT 1 as test`;
    const [rows] = await bigquery.query(query);
    console.log('Success:', rows);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
```

## If Still Not Working

1. **Redeploy the Function**
   - Make a small change to any file
   - Commit and push to trigger a new deployment

2. **Clear Function Cache**
   - In Netlify, go to Deploys → Trigger deploy → Clear cache and deploy site

3. **Check BigQuery Tables Exist**
   - Verify these views exist in BigQuery:
     - `jobber_data.v_quotes`
     - `jobber_data.v_jobs`
     - `jobber_data.v_requests`

4. **Contact Support**
   - If none of the above works, the issue might be with:
     - BigQuery quotas/limits
     - Network connectivity from Netlify to Google Cloud
     - Service account key expiration

## Emergency Fallback

If you need the dashboard working immediately, you can temporarily use mock data by modifying the `useDashboardData` hook to skip the API call and return sample data.