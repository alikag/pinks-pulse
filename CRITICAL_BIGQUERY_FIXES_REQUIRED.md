# CRITICAL BigQuery Fixes Required - NO WORKAROUNDS

## Executive Summary
The dashboard is displaying incorrect metrics due to fundamental data issues in BigQuery. These MUST be fixed at the source. No frontend workarounds or assumptions should be used.

---

## 1. CRITICAL: Speed to Lead Shows Negative Values

### Current Problem
- Speed to Lead shows **-803 minutes average** (negative 13.4 hours)
- 87% of quotes are sent same-day as the request
- ALL same-day quotes show negative values

### Root Cause
**v_quotes.sent_date is DATE type (00:00:00) instead of TIMESTAMP**
- When a request comes in at 2:00 PM and quote is sent at 4:00 PM same day
- Calculation: sent_date (00:00:00) - requested_on_date (14:00:00) = -14 hours

### REQUIRED FIX in v_quotes view
```sql
-- Current (WRONG):
sent_date DATE  -- This becomes midnight 00:00:00

-- Required (CORRECT):
sent_datetime TIMESTAMP  -- Must capture actual time quote was sent
```

### Data Source Fix
The original Jobber data must have a timestamp for when quotes are sent. This needs to be:
1. Extracted from Jobber API with full timestamp
2. Stored in BigQuery tables with TIMESTAMP type
3. Exposed in v_quotes as `sent_datetime` TIMESTAMP field

---

## 2. CRITICAL: Duplicate Quote Records

### Current Problem
- Quote #1154 appears TWICE in v_quotes
- Dashboard shows 8 quotes when Jobber shows 7
- Both records are identical (same client, amount, status)

### Root Cause
v_quotes view is not deduplicating quotes by quote_number

### REQUIRED FIX in v_quotes view
```sql
-- Add deduplication logic to v_quotes:
WITH deduplicated_quotes AS (
  SELECT DISTINCT 
    quote_number,
    FIRST_VALUE(quote_id) OVER (PARTITION BY quote_number ORDER BY updated_at DESC) as quote_id,
    -- ... other fields ...
  FROM source_quotes_table
)
SELECT * FROM deduplicated_quotes
```

---

## 3. CRITICAL: Missing September 2025 Data

### Current Problem
- Jobber shows $32,745 for September 2025
- BigQuery v_jobs shows $0
- Dashboard OTB calculations are wrong

### Root Cause
Data sync from Jobber to BigQuery is incomplete:
- `jobber_job_line_items`: 0 September records
- `jobber_jobs`: Empty table (0 total records)
- `jobber_visits`: Has visits but no values

### REQUIRED FIX
1. Fix Jobber → BigQuery sync pipeline
2. Ensure ALL future scheduled jobs are synced
3. Backfill missing September data

---

## 4. CRITICAL: v_jobs Date Filter Blocks Future Jobs

### Current Problem  
- v_jobs has `WHERE Date <= CURRENT_DATE()` 
- This filters out ALL future scheduled work
- OTB metrics show $0 for future periods

### REQUIRED FIX in v_jobs view
```sql
-- Remove this line completely:
WHERE Date <= CURRENT_DATE()  -- DELETE THIS LINE
```

---

## 5. CRITICAL: Job Dollar Categorization is Wrong

### Current Problem
- ALL revenue goes into `One_off_job_dollars`
- `Visit_based_dollars` is always 0
- Can't distinguish between job types

### Root Cause
v_jobs doesn't properly categorize based on job type

### REQUIRED FIX in v_jobs view
```sql
-- Current (WRONG):
COALESCE(CAST(q.total AS FLOAT64), 0.0) as One_off_job_dollars,
0.0 as Visit_based_dollars

-- Required (CORRECT):
-- Must join with job_line_items and categorize based on line item type
CASE 
  WHEN job_type = 'RECURRING' OR line_item_name LIKE '%visit%' 
  THEN amount ELSE 0 
END as Visit_based_dollars,
CASE 
  WHEN job_type = 'ONE_OFF' AND line_item_name NOT LIKE '%visit%' 
  THEN amount ELSE 0 
END as One_off_job_dollars
```

---

## 6. Winter OTB Calculation Missing Data

### Current Problem
- Winter OTB combines Dec 2024 + Jan 2025 + Feb 2025
- No data exists for Dec 2024 (before company launch)
- Query looking for data that will never exist

### REQUIRED FIX
Change Winter OTB definition to Dec 2025 + Jan 2026 + Feb 2026 OR remove the metric entirely until relevant.

---

## Testing After Fixes

### Test 1: Speed to Lead
```sql
-- Should return POSITIVE values
SELECT 
  AVG(TIMESTAMP_DIFF(sent_datetime, requested_on_date, MINUTE)) as avg_minutes
FROM v_requests r
JOIN v_quotes q ON r.quote_number = q.quote_number
WHERE DATE(requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)

-- Expected: 240-360 minutes (4-6 hours) average
```

### Test 2: Duplicate Quotes
```sql
-- Should return 0 duplicates
SELECT quote_number, COUNT(*) as count
FROM v_quotes
GROUP BY quote_number
HAVING COUNT(*) > 1

-- Expected: 0 rows
```

### Test 3: September Data
```sql
-- Should match Jobber totals
SELECT SUM(Calculated_Value) 
FROM v_jobs
WHERE EXTRACT(YEAR FROM Date) = 2025 
  AND EXTRACT(MONTH FROM Date) = 9

-- Expected: $32,745
```

---

## Implementation Priority

1. **IMMEDIATE**: Fix v_quotes.sent_date to TIMESTAMP (Speed to Lead)
2. **IMMEDIATE**: Deduplicate quotes in v_quotes 
3. **HIGH**: Fix September 2025 data sync
4. **HIGH**: Remove date filter from v_jobs
5. **MEDIUM**: Fix job dollar categorization

---

## Contact Backend Team

These fixes MUST be implemented in BigQuery views and data pipeline. No frontend workarounds should be used. The dashboard will show incorrect data until these are fixed.

**Dashboard will display wrong metrics until these root causes are fixed.**