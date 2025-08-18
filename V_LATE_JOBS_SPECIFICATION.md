# v_late_jobs View Specification for BigQuery

## Overview
Create a BigQuery view that identifies jobs/visits that are past their scheduled date but have NOT been completed. This view powers the Operational KPIs dashboard to track overdue work.

## Current Problem
The existing v_late_jobs view has backwards logic - it's finding COMPLETED jobs instead of INCOMPLETE late jobs.

## Database Information
- **Project**: `jobber-data-warehouse-462721`
- **Dataset**: `jobber_data`
- **Source Table**: `v_jobs`
- **View Name**: `v_late_jobs`

## Business Logic Requirements

### Definition of a "Late Job"
A job is considered "late" when ALL of the following are true:
1. The scheduled date (`Date` field) is in the past (before today in America/New_York timezone)
2. The job has NOT been completed yet
3. The job has NOT been cancelled

### Key Fields to Use from v_jobs

```sql
-- Available fields in v_jobs that are relevant:
Job_Number (INT64)          -- Unique identifier
Client_name (STRING)         -- Customer name
Date (DATE)                  -- Scheduled visit/job date
Date_Converted (DATE)        -- When quote became a job (NOT completion date!)
SalesPerson (STRING)         -- Assigned salesperson
Job_type (STRING)            -- 'ONE_OFF' or 'RECURRING'
Visit_Status (STRING)        -- Status values: 'late', 'upcoming', 'today', 'archived', etc.
Visit_completed (STRING)     -- Completion indicator (likely 'Yes'/'No' or similar)
One_off_job_dollars (FLOAT64)
Visit_based_dollars (FLOAT64)
```

## SQL View Definition

```sql
CREATE OR REPLACE VIEW `jobber-data-warehouse-462721.jobber_data.v_late_jobs` AS
WITH late_jobs_raw AS (
  SELECT 
    Job_Number,
    Client_name,
    Date as scheduled_date,
    SalesPerson,
    Job_type,
    Visit_Status,
    Visit_completed,
    -- Calculate total job value
    COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0) as job_value,
    One_off_job_dollars,
    Visit_based_dollars,
    -- Calculate how many days late
    DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(Date), DAY) as days_late,
    -- Categorize lateness severity
    CASE 
      WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(Date), DAY) > 7 THEN 'critical'
      WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(Date), DAY) > 3 THEN 'high'
      WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(Date), DAY) > 1 THEN 'medium'
      ELSE 'low'
    END as severity
  FROM `jobber-data-warehouse-462721.jobber_data.v_jobs`
  WHERE 
    -- Job is scheduled in the past (not including today)
    DATE(Date) < CURRENT_DATE('America/New_York')
    
    -- CRITICAL: Job is NOT completed
    -- Use one of these approaches based on data availability:
    
    -- Option 1: If Visit_completed field contains Yes/No values
    AND (Visit_completed IS NULL OR UPPER(Visit_completed) != 'YES')
    
    -- Option 2: If Visit_Status indicates completion
    -- AND Visit_Status NOT IN ('completed', 'done', 'archived')
    
    -- Option 3: If we need to check multiple conditions
    -- AND (
    --   Visit_Status IN ('late', 'upcoming', 'today') 
    --   OR Visit_Status IS NULL
    -- )
    
    -- Exclude cancelled jobs if there's a cancellation field
    -- AND (Status != 'cancelled' OR Status IS NULL)
    
    -- Only include jobs from the last 90 days to keep query performant
    AND DATE(Date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 90 DAY)
)
SELECT 
  -- Core identification fields (REQUIRED - DO NOT CHANGE NAMES)
  Job_Number as job_number,
  Client_name as name,
  
  -- Date fields (REQUIRED FORMAT)
  FORMAT_DATE('%Y-%m-%d', scheduled_date) as date_of_visit,
  
  -- For recurring jobs, calculate next visit date if possible
  -- Otherwise NULL for one-off jobs
  CASE 
    WHEN Job_type = 'RECURRING' THEN
      -- If you have recurring schedule data, calculate next visit
      -- For now, returning NULL as placeholder
      CAST(NULL AS STRING)
    ELSE 
      CAST(NULL AS STRING)
  END as date_of_next_visit,
  
  -- Jobber link (REQUIRED)
  CONCAT('https://secure.getjobber.com/jobs/', CAST(Job_Number AS STRING)) as link_to_job,
  
  -- Financial fields (REQUIRED)
  job_value as value,
  
  -- Discount field - set to NULL if not available
  CAST(NULL AS FLOAT64) as discount_applied,
  
  -- Notes field (REQUIRED) - Create informative summary
  CONCAT(
    'Job scheduled ', days_late, ' days ago for ',
    FORMAT_DATE('%b %d, %Y', scheduled_date), '. ',
    'Type: ', COALESCE(Job_type, 'Unknown'), '. ',
    'Salesperson: ', COALESCE(SalesPerson, 'Unassigned'), '. ',
    'Status: ', COALESCE(Visit_Status, 'Unknown'), '. ',
    'Value: $', CAST(ROUND(job_value, 2) AS STRING), '. ',
    CASE 
      WHEN days_late > 7 THEN 'CRITICAL: Over a week late! '
      WHEN days_late > 3 THEN 'HIGH PRIORITY: Several days late. '
      ELSE ''
    END,
    CASE 
      WHEN Job_type = 'RECURRING' THEN 'This is a recurring customer. '
      ELSE ''
    END
  ) as notes,
  
  -- Additional fields for dashboard functionality
  days_late,
  Job_type as job_type,
  SalesPerson as salesperson,
  One_off_job_dollars as one_off_value,
  Visit_based_dollars as recurring_value,
  Visit_Status as visit_status,
  severity,
  
  -- Add timestamp for when this record was generated
  CURRENT_TIMESTAMP() as generated_at

FROM late_jobs_raw

-- Sort by most urgent first
ORDER BY 
  days_late DESC,  -- Most overdue first
  job_value DESC   -- Higher value jobs prioritized
;
```

## CRITICAL Implementation Notes

### 1. Determine Correct Completion Field
**INVESTIGATE FIRST**: You need to determine which field actually indicates job completion:

```sql
-- Run this query to understand the data:
SELECT DISTINCT 
  Visit_Status,
  Visit_completed,
  COUNT(*) as count
FROM `jobber-data-warehouse-462721.jobber_data.v_jobs`
WHERE DATE(Date) < CURRENT_DATE('America/New_York')
GROUP BY Visit_Status, Visit_completed
ORDER BY count DESC
LIMIT 20;
```

Based on the results, adjust the WHERE clause to correctly filter for incomplete jobs.

### 2. Expected Column Names for Frontend
The frontend expects these EXACT column names (case-sensitive):
- `job_number` (not Job_Number)
- `name` (not Client_name)
- `date_of_visit` (formatted as YYYY-MM-DD string)
- `date_of_next_visit` (can be NULL)
- `link_to_job` (full URL)
- `value` (numeric)
- `discount_applied` (can be NULL)
- `notes` (string)

### 3. Timezone Handling
- Always use `CURRENT_DATE('America/New_York')` for date comparisons
- The business operates in Eastern Time

### 4. Performance Considerations
- Include date range filter (last 90 days) to limit result set
- Consider adding clustering on `Date` field if query is slow

## Testing the View

### Test 1: Verify Late Jobs are Found
```sql
SELECT COUNT(*) as late_job_count
FROM `jobber-data-warehouse-462721.jobber_data.v_late_jobs`;
-- Expected: Should return > 0 if there are any incomplete past jobs
```

### Test 2: Verify No Future Jobs Included
```sql
SELECT COUNT(*) as future_jobs
FROM `jobber-data-warehouse-462721.jobber_data.v_late_jobs`
WHERE date_of_visit >= FORMAT_DATE('%Y-%m-%d', CURRENT_DATE('America/New_York'));
-- Expected: 0 (no future jobs should be marked as late)
```

### Test 3: Verify Structure
```sql
SELECT 
  job_number,
  name,
  date_of_visit,
  value,
  days_late
FROM `jobber-data-warehouse-462721.jobber_data.v_late_jobs`
LIMIT 5;
-- Expected: All fields should be populated correctly
```

### Test 4: Check for Completed Jobs (Should be 0)
```sql
-- Adjust this based on your completion field
SELECT COUNT(*) 
FROM `jobber-data-warehouse-462721.jobber_data.v_late_jobs` l
JOIN `jobber-data-warehouse-462721.jobber_data.v_jobs` j 
  ON l.job_number = j.Job_Number
WHERE j.Visit_completed = 'Yes';  -- Or whatever indicates completion
-- Expected: 0 (no completed jobs should appear in late jobs)
```

## Common Issues to Avoid

1. **DO NOT** use `Date_Converted IS NOT NULL` - this indicates quote conversion, not job completion
2. **DO NOT** include future jobs (Date >= today)
3. **DO NOT** include completed/archived jobs
4. **DO NOT** forget timezone specification in date comparisons
5. **DO NOT** change the output column names - frontend expects exact names

## Additional Enhancements (Optional)

If you have access to additional data, consider adding:
1. Customer phone number for quick contact
2. Last communication date with customer
3. Recurring schedule pattern (weekly/monthly/etc)
4. Previous visit dates for context
5. Weather delays or other blocking reasons

## Success Criteria

The view is successful when:
1. Returns only jobs scheduled in the past that are NOT completed
2. Dashboard shows accurate count of late jobs (not 0 when there are late jobs)
3. All required fields are populated
4. Query performs efficiently (< 2 seconds)
5. Results match business understanding of "late jobs"

## Questions to Answer Before Implementation

1. What are the possible values of `Visit_Status`?
2. What are the possible values of `Visit_completed`?
3. Is there a field that indicates job cancellation?
4. How do we identify if a recurring job's visit was completed vs the entire job series?
5. Should we exclude jobs older than X days as "abandoned" rather than "late"?

## Contact for Clarification

If any of these fields don't exist or behave differently than described, please investigate the actual data structure using INFORMATION_SCHEMA queries and sample data queries before implementing.