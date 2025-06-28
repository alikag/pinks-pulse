# Debugging BigQuery Dashboard Data

## Issue Summary
The dashboard is showing zeros for all metrics because of potential issues with:
1. Date filtering logic and timezone handling
2. BigQuery date/timestamp parsing
3. Query limits that might exclude recent data

## Solutions Implemented

### 1. Updated Main Function (`/netlify/functions/dashboard-data.js`)
- Modified queries to fetch last 90 days of data instead of limiting to 1000 rows
- Added proper BigQuery date parsing that handles both Date objects and string formats
- Improved timezone handling for date comparisons
- Fixed date boundary calculations (using start/end of day)

### 2. Debug Function (`/netlify/functions/dashboard-data-debug.js`)
- Returns detailed debug information including:
  - Date ranges in the BigQuery tables
  - Sample data from queries
  - Timezone information
  - Date filtering test results
  - Error details with stack traces

### 3. No-Filter Function (`/netlify/functions/dashboard-data-nofilter.js`)
- Simple version that returns raw data without any date filtering
- Useful for verifying that BigQuery connection and data access work

## Testing Instructions

### Option 1: Test Locally with Node.js

1. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```
   BIGQUERY_PROJECT_ID=jobber-data-warehouse-462721
   GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste your service account JSON here>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Test the debug function**:
   ```bash
   node test-function.js
   ```
   This will show:
   - Date ranges in your BigQuery tables
   - Sample data
   - How many records match today/this week/last 30 days
   - Any errors

4. **Test without filters**:
   ```bash
   node test-nofilter.js
   ```
   This shows raw data without any date filtering.

### Option 2: Deploy and Test on Netlify

1. **Deploy the debug function**:
   - The debug function is at `/netlify/functions/dashboard-data-debug.js`
   - Deploy your site to Netlify
   - Access: `https://your-site.netlify.app/.netlify/functions/dashboard-data-debug`

2. **Check the response** for:
   - `debugInfo.quotesDateRange` - shows min/max dates in quotes table
   - `debugInfo.jobsDateRange` - shows min/max dates in jobs table
   - `debugInfo.dateFilteringTest` - shows how many records match date filters
   - `debugInfo.sampleQuotes` - shows sample data with dates

### Option 3: Use Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Link your site**:
   ```bash
   netlify link
   ```

4. **Run locally with environment variables from Netlify**:
   ```bash
   netlify dev
   ```

5. **Test the function**:
   ```bash
   curl http://localhost:8888/.netlify/functions/dashboard-data-debug
   ```

## Common Issues and Solutions

### 1. All metrics showing as zero
- **Check date ranges**: Look at `debugInfo.quotesDateRange` to see if your data is older than expected
- **Check timezone**: The `debugInfo.timezone` shows what timezone is being used
- **Check sample data**: Look at `debugInfo.sampleQuotes` to see actual date values

### 2. BigQuery authentication errors
- Verify `BIGQUERY_PROJECT_ID` is set correctly
- Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` contains valid service account credentials
- Check that the service account has BigQuery Data Viewer permissions

### 3. Date parsing issues
- BigQuery returns dates in different formats (Date objects vs strings)
- The updated `parseBQDate` function handles both formats
- Check `debugInfo.sampleQuotes` to see how dates are being parsed

### 4. No recent data
- The original query limited to 1000 rows, which might not include recent data
- Updated queries now filter by date range (last 90 days) instead of row limit
- Check `debugInfo.quotesDateRange.max_sent` to see the most recent sent_date

## Next Steps

1. **Run the debug function** to understand your data's date ranges
2. **Check if removing date filters shows data** using the no-filter function
3. **Verify timezone handling** - BigQuery might store dates in UTC
4. **Consider adding explicit timezone conversion** if needed

## Modified Functions Summary

1. **Main function** (`dashboard-data.js`):
   - Updated with better date handling
   - Queries last 90 days instead of limiting rows
   - Improved date parsing for BigQuery formats

2. **Debug function** (`dashboard-data-debug.js`):
   - Returns extensive debug information
   - Shows date ranges and sample data
   - Helps identify filtering issues

3. **No-filter function** (`dashboard-data-nofilter.js`):
   - Simple version without date filtering
   - Useful for verifying data access

The debug information will help identify whether the issue is:
- No recent data in BigQuery
- Timezone mismatches
- Date parsing problems
- Query filtering being too restrictive