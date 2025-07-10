# Fix BigQuery Connection - Step by Step

## The Problem
Your dashboard is showing a 500 error because Netlify cannot connect to BigQuery. This is almost certainly because the environment variables are missing.

## Fix It Right Now (5 minutes)

### Step 1: Test Current Status
Open this link: https://pinkspulse.netlify.app/.netlify/functions/dashboard-data-sales/test

If you see `"hasProjectId": false`, your environment variables are NOT set.

### Step 2: Get Your Service Account JSON
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (should be something like "pinks-dashboard-xxxxx")
3. Go to IAM & Admin → Service Accounts
4. Find your service account (should have "BigQuery" in the description)
5. Click the three dots → Manage keys → Add Key → Create new key → JSON
6. Download the JSON file

### Step 3: Format the JSON
1. Open the downloaded JSON file in a text editor
2. Go to https://www.text-utils.com/json-minifier/
3. Paste your entire JSON content
4. Click "Minify JSON"
5. Copy the single-line result

### Step 4: Set Netlify Environment Variables
1. Go to https://app.netlify.com
2. Click on your site "pinkspulse"
3. Go to Site configuration → Environment variables
4. Click "Add a variable" → "Add a single variable"

**First Variable:**
- Key: `BIGQUERY_PROJECT_ID`
- Value: (your project ID from the JSON file, e.g., `pinks-dashboard-123456`)
- Click "Create variable"

**Second Variable:**
- Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Value: (paste the entire minified JSON from step 3)
- Click "Create variable"

### Step 5: Deploy with New Variables
1. Still in Netlify, go to the "Deploys" tab
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. Wait 2-3 minutes for deployment

### Step 6: Verify It's Working
1. Go back to: https://pinkspulse.netlify.app/.netlify/functions/dashboard-data-sales/test
2. You should now see `"hasProjectId": true`
3. Refresh your dashboard - it should load real data!

## Still Not Working?

### Check These Common Issues:

1. **JSON Format Error**
   - Make sure the JSON is on ONE LINE
   - No quotes around the JSON value in Netlify
   - No spaces before or after the JSON

2. **Wrong Project ID**
   - The project ID should match what's in your JSON file
   - Look for `"project_id": "your-project-id"` in the JSON

3. **Permission Issues**
   In Google Cloud Console:
   - Go to IAM & Admin → IAM
   - Find your service account email
   - Make sure it has these roles:
     - BigQuery Data Viewer
     - BigQuery Job User

4. **Check Function Logs**
   - In Netlify: Functions → dashboard-data-sales → View logs
   - Look for specific error messages

## Example of Correct Setup

**BIGQUERY_PROJECT_ID:**
```
pinks-dashboard-426919
```

**GOOGLE_APPLICATION_CREDENTIALS_JSON:**
```
{"type":"service_account","project_id":"pinks-dashboard-426919","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"bigquery-reader@pinks-dashboard-426919.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/bigquery-reader%40pinks-dashboard-426919.iam.gserviceaccount.com"}
```

## Need More Help?

If you're still having issues after following these steps:
1. The test page at `/test-env.html` has more diagnostic tools
2. Check if your BigQuery tables exist: `jobber_data.v_quotes`, `jobber_data.v_jobs`
3. Make sure your service account key hasn't expired (they don't usually expire, but can be revoked)