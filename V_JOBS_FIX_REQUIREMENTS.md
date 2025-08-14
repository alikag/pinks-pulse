# v_jobs View Fix Requirements

## Current Issues Identified

### 1. Missing Future Jobs (Critical for OTB)
**Problem**: The v_jobs view has `WHERE Date <= CURRENT_DATE()` which filters out ALL future scheduled work.

**Impact**: 
- Weekly OTB chart shows no data
- Monthly OTB stops at current date (August 14, 2025)
- Cannot calculate "On The Books" revenue for future periods

**Fix Required**: Remove the `WHERE Date <= CURRENT_DATE()` filter from the view definition.

### 2. Missing September 2025 Data
**Problem**: No September 2025 data exists in the source tables despite Jobber showing $32,745.

**Current State**:
- `jobber_job_line_items`: No September data (0 records)
- `jobber_visits`: Has 5 September visits but no associated values
- `jobber_jobs`: Empty table (0 records total)

**Jobber Shows**:
- One-off jobs: $31,100
- Visit-based: $1,645
- Total: $32,745

**Fix Required**: Sync September 2025 data from Jobber to BigQuery tables.

### 3. Incorrect Dollar Value Calculation
**Current Logic in v_jobs**:
```sql
COALESCE(CAST(q.total AS FLOAT64), 0.0) as One_off_job_dollars,
0.0 as Visit_based_dollars
```

This is wrong because:
- It puts ALL revenue in One_off_job_dollars
- Visit_based_dollars is always 0
- Doesn't differentiate between job types

**Correct Logic Should Be**:
```sql
-- Join with jobber_job_line_items to get line item details
-- Then categorize based on line item name/description:
SUM(CASE 
  WHEN LOWER(line_item.name) LIKE '%recurring%' 
    OR LOWER(line_item.name) LIKE '%monthly%' 
    OR LOWER(line_item.name) LIKE '%weekly%'
    OR LOWER(line_item.name) LIKE '%visit%'
    OR LOWER(line_item.name) LIKE '%maintenance%'
  THEN CAST(line_item.total_cost AS FLOAT64)
  ELSE 0
END) as Visit_based_dollars,

SUM(CASE 
  WHEN NOT (conditions above)
  THEN CAST(line_item.total_cost AS FLOAT64)
  ELSE 0
END) as One_off_job_dollars
```

## Data Flow Issues

### Current (Broken) Flow:
1. Jobber → ??? → BigQuery tables (incomplete sync)
2. Tables → v_jobs view (with date filter blocking future)
3. v_jobs → Dashboard (shows $0 for OTB)

### Required Flow:
1. Jobber → API/Webhook → BigQuery tables (complete sync including future visits)
2. Tables → v_jobs view (no date restrictions)
3. v_jobs → Dashboard (accurate OTB calculations)

## Required View Changes

### 1. Remove Date Filter
```sql
-- REMOVE THIS LINE:
WHERE Date <= CURRENT_DATE()
```

### 2. Join with Job Line Items
The view needs to join with `jobber_job_line_items` to get actual job values:

```sql
LEFT JOIN (
  SELECT 
    job_id,
    SUM(CASE 
      WHEN LOWER(name) LIKE '%recurring%' 
        OR LOWER(name) LIKE '%visit%'
        -- etc.
      THEN CAST(total_cost AS FLOAT64)
      ELSE 0
    END) as visit_based_amount,
    SUM(CASE 
      WHEN NOT (above conditions)
      THEN CAST(total_cost AS FLOAT64)
      ELSE 0
    END) as one_off_amount
  FROM jobber_data.jobber_job_line_items
  GROUP BY job_id
) line_items ON line_items.job_id = [job_id_field]
```

### 3. Handle Missing Data Gracefully
Use COALESCE to handle cases where line items are missing:

```sql
COALESCE(line_items.one_off_amount, quote.total, 0) as One_off_job_dollars,
COALESCE(line_items.visit_based_amount, 0) as Visit_based_dollars
```

## Data Sync Requirements

### Tables Needing September 2025 Data:
1. **jobber_job_line_items** - Currently has 0 September records
2. **jobber_jobs** - Currently completely empty
3. **jobber_visits** - Has visits but no associated values

### Sync Verification Query:
```sql
-- Check if September data is synced
SELECT 
  'jobber_job_line_items' as table_name,
  COUNT(*) as sept_records,
  SUM(CAST(total_cost AS FLOAT64)) as total_value
FROM jobber_data.jobber_job_line_items
WHERE extracted_at >= '2025-09-01' 
  AND extracted_at < '2025-10-01'

UNION ALL

SELECT 
  'jobber_visits' as table_name,
  COUNT(*) as sept_records,
  NULL as total_value
FROM jobber_data.jobber_visits
WHERE DATE(start_at) >= '2025-09-01' 
  AND DATE(start_at) < '2025-10-01'
```

## Testing After Fixes

### Test 1: Verify Future Jobs Appear
```sql
SELECT COUNT(*) as future_jobs
FROM v_jobs
WHERE Date > CURRENT_DATE()
```
Expected: Should return > 0

### Test 2: Verify September Totals
```sql
SELECT 
  SUM(One_off_job_dollars) as one_off,
  SUM(Visit_based_dollars) as visit_based,
  SUM(Calculated_Value) as total
FROM v_jobs
WHERE EXTRACT(YEAR FROM Date) = 2025
  AND EXTRACT(MONTH FROM Date) = 9
```
Expected: 
- one_off ≈ $31,100
- visit_based ≈ $1,645
- total ≈ $32,745

### Test 3: Verify Weekly OTB
```sql
SELECT 
  DATE_TRUNC(Date, WEEK(SUNDAY)) as week_start,
  SUM(Calculated_Value) as weekly_otb
FROM v_jobs
WHERE Date >= CURRENT_DATE()
GROUP BY week_start
ORDER BY week_start
LIMIT 11
```
Expected: Should return data for next 11 weeks

## Priority Order

1. **IMMEDIATE**: Remove `WHERE Date <= CURRENT_DATE()` filter
2. **HIGH**: Fix data sync for September 2025
3. **HIGH**: Correct the One_off vs Visit_based calculation logic
4. **MEDIUM**: Ensure ongoing sync captures all future scheduled visits

## Notes for Backend Developer

- The `jobber_visits` table has future data through 2035, so the raw data exists
- The issue is primarily in the view definition and missing job_line_items data
- Consider setting up monitoring for data sync gaps
- The dashboard expects these exact column names: `One_off_job_dollars`, `Visit_based_dollars`, `Calculated_Value`