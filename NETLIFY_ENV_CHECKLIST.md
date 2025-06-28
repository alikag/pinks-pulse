# Netlify Environment Variables Checklist

## Required Environment Variables

You need to set these in your Netlify dashboard (Site settings → Environment variables):

### 1. BIGQUERY_PROJECT_ID
- **Example**: `my-project-123456`
- **How to find**: Look in your Google Cloud Console URL or BigQuery interface
- **Common mistake**: Including quotes or spaces

### 2. GOOGLE_APPLICATION_CREDENTIALS_JSON
- **Format**: Full JSON service account key as a single-line string
- **Example**: `{"type":"service_account","project_id":"my-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}`
- **Common mistakes**:
  - Not escaping the JSON properly
  - Line breaks in the private key not preserved
  - Missing quotes around the entire JSON

## How to Check if Variables are Set Correctly

1. **In Netlify Dashboard**:
   - Go to Site settings → Environment variables
   - Verify both variables are listed
   - Check that GOOGLE_APPLICATION_CREDENTIALS_JSON shows as a long string

2. **View Function Logs**:
   - Go to Functions tab in Netlify
   - Click on `dashboard-data-sales`
   - Look for logs starting with `[dashboard-data-sales]`
   - You should see:
     ```
     [dashboard-data-sales] Environment check: {
       hasProjectId: true,
       projectId: 'your-project-id',
       hasCredentials: true,
       credentialsLength: 2000+ (should be a large number)
     }
     ```

3. **In Browser Console**:
   - Open https://pinkspulse.netlify.app/
   - Open Developer Tools → Console
   - Look for `[BigQueryService]` logs
   - You should see: `Data source: bigquery`
   - If you see `Data source: mock`, BigQuery connection failed

## Common Issues and Fixes

### Issue 1: "hasCredentials: false" in logs
**Fix**: The GOOGLE_APPLICATION_CREDENTIALS_JSON variable is not set or empty

### Issue 2: "JSON parse error" in logs
**Fix**: The JSON is malformed. Common issues:
- Missing quotes
- Line breaks not properly escaped
- Truncated JSON

### Issue 3: "Permission denied" errors
**Fix**: The service account doesn't have BigQuery permissions:
1. Go to Google Cloud Console
2. IAM & Admin → Service Accounts
3. Find your service account email
4. Ensure it has "BigQuery Data Viewer" role

### Issue 4: "Table not found" errors
**Fix**: The table `jobber_data.v_quotes` doesn't exist
- Verify dataset name is `jobber_data`
- Verify view name is `v_quotes`
- Check the query is targeting the right project

## Quick Test

After setting variables, you can test by:
1. Trigger a new deploy (push any small change)
2. Visit the site
3. Check browser console for data source
4. Check Netlify function logs for detailed diagnostics