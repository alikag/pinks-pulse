# BigQuery Connection Troubleshooting Guide

## Overview
This guide helps diagnose why BigQuery data isn't flowing through to the dashboard and provides steps to fix common issues.

## Quick Diagnosis

### 1. Check Browser Console
Open your browser's developer console and look for these log messages:

- `[BigQueryService] Data source: mock` - The API is returning mock data (BigQuery failed)
- `[BigQueryService] Data source: bigquery` - Successfully using BigQuery data
- `[BigQueryService] Server returned error:` - Shows the specific BigQuery error

### 2. Check Netlify Function Logs
In Netlify dashboard, go to Functions tab and check the logs for `dashboard-data-sales`:

Look for these key log messages:
- `[dashboard-data-sales] Environment check:` - Shows if credentials are loaded
- `[dashboard-data-sales] BigQuery error details:` - Shows specific error if connection fails
- `[dashboard-data-sales] Falling back to mock data` - Indicates BigQuery connection failed

## Common Issues and Solutions

### Issue 1: Missing Environment Variables
**Symptoms:**
- Logs show: `hasProjectId: false` or `hasCredentials: false`
- Error: "No Google credentials found in environment"

**Solution:**
1. In Netlify dashboard, go to Site Settings > Environment Variables
2. Add these variables:
   - `BIGQUERY_PROJECT_ID`: Your Google Cloud project ID
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Your service account JSON (entire contents)

### Issue 2: Invalid Credentials JSON
**Symptoms:**
- Error: "Failed to parse credentials JSON"
- Error: "Invalid Google credentials JSON format"

**Solution:**
1. Ensure the JSON is valid (use a JSON validator)
2. Make sure you're copying the ENTIRE service account JSON file
3. Don't add extra quotes around the JSON in Netlify

### Issue 3: Missing Permissions
**Symptoms:**
- Error: "Permission denied" or "403 Forbidden"
- Successfully connects but no data returned

**Solution:**
1. In Google Cloud Console, ensure your service account has these roles:
   - BigQuery Data Viewer
   - BigQuery Job User
2. Verify the service account has access to the `jobber_data` dataset

### Issue 4: Dataset or View Not Found
**Symptoms:**
- Error: "Not found: Table" or "Dataset jobber_data not found"
- Query fails with 404 error

**Solution:**
1. Verify the dataset exists: `jobber_data`
2. Verify the view exists: `v_quotes`
3. Check that the project ID in environment variables matches your BigQuery project

## Testing BigQuery Connection Locally

### Run the Test Script
```bash
# Install dependencies if needed
npm install

# Run the test script
node test-bigquery-connection.js
```

This script will:
1. Check environment variables
2. Parse and validate credentials
3. List available datasets
4. Check for jobber_data dataset
5. List tables in jobber_data
6. Test querying v_quotes
7. Run the full production query

### Expected Output
```
=== BigQuery Connection Test ===

1. Checking environment variables...
   - BIGQUERY_PROJECT_ID: Found (your-project-id)
   - GOOGLE_APPLICATION_CREDENTIALS_JSON: Found (2345 chars)

2. Parsing Google credentials...
   ✓ Credentials parsed successfully

3. Creating BigQuery client...
   ✓ BigQuery client created

4. Testing BigQuery connection...
   ✓ Found 3 datasets
     • jobber_data
     • analytics
     • raw_data

5. Checking jobber_data dataset...
   ✓ Found 5 tables/views in jobber_data:
     • v_quotes
     • quotes_raw
     • clients
     • salespersons

6. Testing v_quotes query...
   ✓ Query executed successfully in 523ms
   ✓ Retrieved 5 rows

✅ All tests passed! BigQuery connection is working correctly.
```

## Debugging Steps

### 1. Enable Verbose Logging
The updated function now includes comprehensive logging. Deploy and check the logs.

### 2. Test Locally First
Before deploying, test locally:
```bash
# Create .env file with your credentials
echo "BIGQUERY_PROJECT_ID=your-project-id" > .env
echo "GOOGLE_APPLICATION_CREDENTIALS_JSON='paste-json-here'" >> .env

# Run the test
node test-bigquery-connection.js
```

### 3. Verify Netlify Deployment
After deploying:
1. Visit your site
2. Open browser console
3. Look for `[BigQueryService]` logs
4. Check if `dataSource` is "bigquery" or "mock"

### 4. Check Data Flow
The data flow is:
1. Browser calls `/.netlify/functions/dashboard-data-sales`
2. Function connects to BigQuery
3. Function queries `v_quotes` view
4. Function transforms data into dashboard format
5. Function returns data (or mock data on error)
6. Browser receives and displays data

## Mock Data Fallback

The system is designed to fall back to mock data if BigQuery fails. This ensures the dashboard always displays something, but you'll see static demo data instead of real data.

To identify mock data:
- Check browser console for: `WARNING: Server is returning mock data!`
- Mock data always shows the same values
- Mock data has fixed salesperson names (Michael Squires, Christian Ruddy)

## Need More Help?

If you're still having issues:

1. Check the full error stack trace in Netlify function logs
2. Verify your BigQuery setup:
   - Dataset exists and is accessible
   - View `v_quotes` has the expected schema
   - Service account has proper permissions
3. Test the BigQuery query directly in Google Cloud Console
4. Ensure your Netlify site is properly deployed with the latest function code