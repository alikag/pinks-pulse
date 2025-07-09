# Quick Environment Variable Check

## Immediate Actions

### 1. Test the Environment
Visit this URL right now:
```
https://pinkspulse.netlify.app/.netlify/functions/dashboard-data-sales/test
```

If you see `"hasProjectId": false`, then the environment variables are not set.

### 2. Set Environment Variables in Netlify

1. Go to https://app.netlify.com
2. Select your site "pinkspulse"
3. Go to Site settings → Environment variables
4. Add these two variables:

**BIGQUERY_PROJECT_ID**
```
your-google-cloud-project-id
```
(No quotes, just the project ID like `pinks-dashboard-123456`)

**GOOGLE_APPLICATION_CREDENTIALS_JSON**
```
{"type":"service_account","project_id":"...your entire JSON here on one line..."}
```
(Paste the entire service account JSON as ONE LINE, no quotes around it)

### 3. How to Format the JSON

1. Open your service account JSON file
2. Go to https://www.freeformatter.com/json-formatter.html
3. Paste your JSON
4. Click "Minify/Compact"
5. Copy the result and paste it as the value for GOOGLE_APPLICATION_CREDENTIALS_JSON

### 4. Trigger a Redeploy

After setting the environment variables:
1. Go to Deploys tab in Netlify
2. Click "Trigger deploy" → "Clear cache and deploy site"

### 5. Verify It's Working

After deployment completes (2-3 minutes):
1. Visit the test endpoint again
2. You should see `"hasProjectId": true`
3. Refresh your dashboard - it should load data

## If Still Not Working

The error messages in the browser console suggest the BigQuery connection is failing. Check:

1. **Service Account Permissions** - In Google Cloud Console, ensure your service account has:
   - BigQuery Data Viewer
   - BigQuery Job User

2. **BigQuery Tables** - Verify these exist:
   - `jobber_data.v_quotes`
   - `jobber_data.v_jobs`
   - `jobber_data.v_requests`

3. **Check Netlify Function Logs**:
   - Netlify Dashboard → Functions → dashboard-data-sales
   - Look for specific error messages

## Common Mistakes to Avoid

❌ Don't put quotes around the environment variable values in Netlify
❌ Don't include line breaks in the JSON
❌ Don't use the JSON file path - use the actual JSON content
❌ Don't forget to redeploy after changing environment variables

## Need the Dashboard Working NOW?

If you need immediate access while fixing the BigQuery connection, I can create a temporary mock data mode. Let me know if you want that as a stopgap solution.