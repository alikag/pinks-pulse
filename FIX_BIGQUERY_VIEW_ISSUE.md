# BigQuery View Type Mismatch Issue

## Problem
The `v_jobs` view in BigQuery has an internal type mismatch error. When queried, it returns:
```
No matching signature for operator > for argument types: STRING, INT64
Signature: T1 > T1
Unable to find common supertype for templated argument <T1>
Input types for <T1>: {INT64, STRING}; failed to parse view 'jobber-data-warehouse-462721.jobber_data.v_jobs' at [149:50]
```

## Root Cause
At line 149, column 50 of the `v_jobs` view definition, there's a comparison between a STRING and INT64 field, which BigQuery doesn't allow.

## Solution Options

### Option 1: Fix the View Definition (Recommended)
1. Go to BigQuery console
2. Find the `jobber_data.v_jobs` view
3. Edit the view definition
4. Look for line 149 (around column 50) where there's a comparison operation
5. Fix the type mismatch by:
   - Casting the STRING to INT64: `CAST(string_field AS INT64) > numeric_field`
   - Or casting the INT64 to STRING: `string_field > CAST(numeric_field AS STRING)`
   - Or ensure both sides of the comparison are the same type

### Option 2: Create a New View Without the Issue
Create a new view `v_jobs_fixed` that doesn't have the type mismatch:

```sql
CREATE OR REPLACE VIEW `jobber-data-warehouse-462721.jobber_data.v_jobs_fixed` AS
SELECT 
  CAST(job_number AS STRING) AS Job_Number,
  date AS Date,
  CAST(created_at AS STRING) AS Date_Converted,
  assigned_to AS SalesPerson,
  job_type AS Job_type,
  CAST(total AS FLOAT64) AS Calculated_Value,
  -- Add other fields as needed
FROM `jobber-data-warehouse-462721.jobber_data.jobber_jobs`
WHERE status != 'CANCELLED'
```

### Option 3: Update Dashboard to Use Base Table
Instead of using the problematic view, update the dashboard queries to use the base `jobber_jobs` table directly. This is what I started doing in the code, but it would be better to fix the view.

## Immediate Workaround (Already Applied)
I've updated the dashboard code to query `jobber_jobs` table directly instead of the `v_jobs` view to bypass this issue temporarily.

## What Needs to Be Done
1. **Find the exact issue in v_jobs view** - Look at line 149 of the view definition
2. **Fix the type mismatch** - Ensure comparisons are between compatible types
3. **Test the fixed view** - Run a simple SELECT query to ensure it works
4. **Update the dashboard** - Once fixed, we can revert to using the view

## Example of Common Type Mismatches
```sql
-- Wrong (comparing STRING to INT64):
WHERE some_string_field > 100

-- Correct:
WHERE CAST(some_string_field AS INT64) > 100
-- OR
WHERE some_string_field > '100'
```