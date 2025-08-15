# BigQuery View Requirements for Pink's Dashboard

## Overview
Pink's Dashboard requires three primary BigQuery views to function correctly. These views aggregate data from Jobber (CRM system) to provide real-time business analytics.

## Required Views

### 1. `v_quotes` - Quote Management View

**Purpose**: Tracks all quotes sent to customers, their conversion status, and revenue metrics.

**Required Columns**:
- `quote_number` (STRING) - Unique identifier for the quote
- `quote_id` (STRING) - Jobber's internal quote ID
- `client_name` (STRING) - Customer name
- `salesperson` (STRING) - Sales rep who created the quote
- `status` (STRING) - Quote status (sent, converted, expired, etc.)
- `total_dollars` (FLOAT64) - Quote value in dollars
- `sent_date` (DATE) - When quote was sent to customer
- `converted_date` (DATE, nullable) - When quote became a job (NULL if not converted)
- `days_to_convert` (INT64, nullable) - Days between sent and converted
- `job_numbers` (STRING, nullable) - Associated job numbers if converted

**Data Requirements**:
- Must include all quotes from 2024-01-01 onwards
- `sent_date` must never be NULL for valid quotes
- `converted_date` should be NULL for quotes that haven't converted yet
- `total_dollars` should exclude sales tax

**Sample Query Usage**:
```sql
-- Daily quotes sent
SELECT COUNT(*) FROM v_quotes 
WHERE DATE(sent_date) = CURRENT_DATE('America/New_York')

-- Weekly conversion rate
SELECT 
  COUNT(*) as total_sent,
  COUNT(converted_date) as total_converted,
  COUNT(converted_date) * 100.0 / COUNT(*) as conversion_rate
FROM v_quotes
WHERE EXTRACT(WEEK FROM sent_date) = EXTRACT(WEEK FROM CURRENT_DATE('America/New_York'))
```

### 2. `v_jobs` - Jobs/Visits View

**Purpose**: Tracks all scheduled work (jobs/visits) for "On The Books" (OTB) revenue calculations.

**Required Columns**:
- `Job_Number` (INT64) - Unique job identifier
- `Date` (DATE) - Scheduled visit/job date
- `Date_Converted` (DATE, nullable) - When the quote became a job
- `SalesPerson` (STRING, nullable) - Sales rep who closed the deal
- `Job_type` (STRING) - 'RECURRING' or 'ONE_OFF'
- `Calculated_Value` (FLOAT64) - Total job value (computed column)
- `One_off_job_dollars` (FLOAT64, nullable) - Revenue from one-time jobs
- `Visit_based_dollars` (FLOAT64, nullable) - Revenue from recurring jobs
- `Client_name` (STRING) - Customer name
- `Visit_title` (STRING, nullable) - Description of the work
- `Visit_Status` (STRING, nullable) - Status of the visit

**Computed Columns**:
```sql
Calculated_Value = COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)
```

**Data Requirements**:
- Must include all jobs for current year and next 2 years
- `Date` field represents when work is scheduled, not when quote was created
- Include both completed and scheduled future jobs
- Exclude cancelled jobs
- **CRITICAL**: Must include September 2025 data (currently missing)

**Known Issues**:
- September 2025 data is not syncing from Jobber (shows $32,745 in Jobber but $0 in BigQuery)
- Data sync appears to stop at August 2025

**Sample Query Usage**:
```sql
-- Monthly OTB (On The Books)
SELECT 
  EXTRACT(MONTH FROM Date) as month,
  SUM(Calculated_Value) as monthly_revenue
FROM v_jobs
WHERE EXTRACT(YEAR FROM Date) = 2025
GROUP BY month

-- Winter OTB (Dec + Jan + Feb)
SELECT SUM(Calculated_Value) as winter_otb
FROM v_jobs
WHERE EXTRACT(YEAR FROM Date) IN (2024, 2025)
  AND EXTRACT(MONTH FROM Date) IN (12, 1, 2)
```

### 3. `v_requests` - Customer Request View

**Purpose**: Tracks initial customer requests to calculate "Speed to Lead" metrics.

**Required Columns**:
- `quote_number` (STRING) - Links to v_quotes.quote_number
- `requested_on_date` (TIMESTAMP) - When customer submitted request
- `client_name` (STRING, nullable) - Customer name
- `request_id` (STRING, nullable) - Unique request identifier

**Data Requirements**:
- Must have `quote_number` to join with v_quotes
- `requested_on_date` must be a TIMESTAMP for minute-level calculations
- Include last 90 days of data minimum

**Sample Query Usage**:
```sql
-- Speed to Lead (average minutes from request to quote)
SELECT 
  AVG(TIMESTAMP_DIFF(
    CAST(q.sent_date AS TIMESTAMP),
    CAST(r.requested_on_date AS TIMESTAMP), 
    MINUTE
  )) as avg_minutes_to_quote
FROM v_requests r
JOIN v_quotes q ON r.quote_number = q.quote_number
WHERE r.requested_on_date IS NOT NULL
  AND q.sent_date IS NOT NULL
  AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
```

## Data Sync Requirements

### Current Architecture
Based on table analysis, the data flow appears to be:
1. Jobber → Integrately (webhook/API integration)
2. Integrately → BigQuery tables (integrately_jobs, integrately_quotes)
3. BigQuery tables → Views (v_jobs, v_quotes, v_requests)

### Sync Frequency
- **Required**: At least hourly for quotes and requests
- **Ideal**: Real-time or every 15 minutes
- **Critical**: Must include current day's data for "Today" metrics

### Data Freshness Issues
**Current Problem**: September 2025 jobs data exists in Jobber but not in BigQuery
- Jobber shows: One-off: $31,100, Visit-based: $1,645, Total: $32,745
- BigQuery shows: $0 for September 2025

**Investigation Findings**:
- `jobber_visits` table is completely empty (0 rows)
- `jobber_jobs` table has no September 2025 data
- `integrately_jobs` table only has 5 jobs for September (appears incomplete)
- Latest complete month in BigQuery is August 2025

## Performance Requirements

### Query Timeouts
- All queries must complete within 8 seconds
- Large date ranges should be limited (max 5000 rows for quotes)
- Use appropriate indexes on date columns

### Optimization Tips
1. Partition tables by date if possible
2. Create materialized views for frequently accessed aggregations
3. Index foreign keys (quote_number, job_number)
4. Consider caching layer for historical data

## Timezone Handling

All date/time calculations must use **America/New_York** timezone:
- `CURRENT_DATE('America/New_York')` for today's date
- All "Today" metrics based on Eastern Time
- Week starts on Sunday in Eastern Time

## Testing Queries

### Verify View Existence
```sql
SELECT table_name, table_type
FROM jobber_data.INFORMATION_SCHEMA.TABLES
WHERE table_name IN ('v_quotes', 'v_jobs', 'v_requests')
```

### Check Data Freshness
```sql
-- Latest quote
SELECT MAX(sent_date) as latest_quote_date
FROM v_quotes

-- Latest job
SELECT MAX(Date) as latest_job_date
FROM v_jobs

-- Latest request
SELECT MAX(DATE(requested_on_date)) as latest_request_date
FROM v_requests
```

### Validate September 2025 Data
```sql
SELECT 
  EXTRACT(MONTH FROM Date) as month,
  COUNT(*) as job_count,
  SUM(Calculated_Value) as total_value
FROM v_jobs
WHERE EXTRACT(YEAR FROM Date) = 2025
  AND EXTRACT(MONTH FROM Date) = 9
```

## Known Data Issues (August 15, 2025)

### Duplicate Quote Records
**Problem**: Quote #1154 (Paul Fargione) appears twice in v_quotes with identical data
- Both records show status: "draft", sent_date: 2025-08-15, total: $2052
- This causes dashboard to show 8 quotes when Jobber shows 7
- Total value is correct but count is off by 1

**Impact**: Dashboard shows 8 quotes sent today instead of 7
**Fix Required**: v_quotes view should deduplicate quotes by quote_number

## Error Handling

The dashboard backend expects:
1. All three views must exist
2. Required columns must be present (queries will fail otherwise)
3. Date columns should handle NULL values gracefully
4. Monetary values should default to 0, not NULL
5. Quotes should be deduplicated by quote_number to prevent counting issues

## Contact for Issues

If views are missing or data sync is broken:
1. Check Integrately webhook status
2. Verify BigQuery permissions for service account
3. Check jobber_data.sync_status table for last sync time
4. Review Cloud Functions logs for sync errors

## Environment Variables Required

The backend requires these environment variables:
- `BIGQUERY_PROJECT_ID`: The Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Service account credentials (JSON string)

Service account must have:
- BigQuery Data Viewer role
- BigQuery Job User role