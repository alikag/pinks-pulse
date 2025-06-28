# BigQuery Connection Status Check Guide

## Quick Status Check

### 1. Check Live Site Status
Visit: https://pinkspulse.netlify.app/test-bigquery-status.html

This page will automatically test all BigQuery endpoints and show:
- 🟢 **Green** = Connected to BigQuery (Live Data)
- 🟡 **Yellow** = Using Mock Data (BigQuery connection failed)
- 🔴 **Red** = Function Error

### 2. Check Browser Console
1. Open https://pinkspulse.netlify.app/
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for `[BigQueryService]` logs

**Good Sign:**
```
[BigQueryService] Data source: bigquery
[BigQueryService] SUCCESS: Server returned BigQuery data
```

**Problem Sign:**
```
[BigQueryService] Data source: mock
[BigQueryService] WARNING: Server is returning mock data!
```

### 3. Check Netlify Function Logs
1. Go to Netlify Dashboard
2. Navigate to Functions tab
3. Click on `dashboard-data-sales`
4. Check recent logs

**Good Logs:**
```
[dashboard-data-sales] Environment check: {
  hasProjectId: true,
  projectId: 'your-project-id',
  hasCredentials: true,
  credentialsLength: 2000+
}
[dashboard-data-sales] Query results: 213 quotes, 45 jobs, 128 requests
```

**Problem Logs:**
```
[dashboard-data-sales] Environment check: {
  hasProjectId: false,
  hasCredentials: false
}
[dashboard-data-sales] Error: Could not load credentials
```

## Troubleshooting Steps

### If BigQuery is Not Connected:

#### 1. Verify Environment Variables in Netlify
- Go to Site settings → Environment variables
- Check these are set:
  - `BIGQUERY_PROJECT_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`

#### 2. Test Individual Endpoints
Use the test page or curl commands:

```bash
# Check environment variables
curl https://pinkspulse.netlify.app/.netlify/functions/check-bigquery-env

# Test BigQuery connection
curl https://pinkspulse.netlify.app/.netlify/functions/test-bigquery

# Get dashboard data
curl https://pinkspulse.netlify.app/.netlify/functions/dashboard-data-sales
```

#### 3. Verify BigQuery Permissions
The service account needs:
- BigQuery Data Viewer role
- Access to `jobber_data` dataset
- Access to views: `v_quotes`, `v_jobs`, `v_requests`

#### 4. Check Data Flow
1. **Backend → BigQuery**: Check function logs for query execution
2. **Backend → Frontend**: Check network tab for API responses
3. **Frontend Display**: Check if KPIs show real numbers vs placeholder data

## Expected Data When Connected

When BigQuery is properly connected, you should see:
- Real quote numbers and conversion rates
- Actual salesperson names and performance
- Live speed-to-lead metrics
- Current OTB (On The Books) values
- Dynamic time series charts with real data

## Common Issues

### "Permission Denied" Error
- Service account lacks BigQuery permissions
- Wrong project ID
- Dataset or views don't exist

### "Invalid Credentials" Error
- JSON format is incorrect
- Credentials not properly escaped
- Missing or truncated JSON

### Data Shows but is Outdated
- Check BigQuery views are being updated
- Verify data pipeline is running
- Check for timezone issues (EST vs UTC)

## Testing Checklist

- [ ] Environment variables set in Netlify
- [ ] Test page shows green status for all endpoints
- [ ] Browser console shows "bigquery" data source
- [ ] Function logs show successful queries
- [ ] Dashboard displays real-time data
- [ ] KPIs update when new data is added
- [ ] Time series charts show current period

## Need Help?

1. Check `/netlify/functions/dashboard-data-sales.js` for query logic
2. Review `NETLIFY_ENV_CHECKLIST.md` for setup steps
3. See `BIGQUERY_TROUBLESHOOTING.md` for detailed debugging