-- View: v_late_jobs
-- Purpose: Identify jobs that are past their scheduled date with comprehensive information
-- Note: Some fields require additional data sources that aren't currently available

CREATE OR REPLACE VIEW `jobber_data.v_late_jobs` AS
WITH job_details AS (
  SELECT 
    j.Job_Number,
    j.Client_Name,
    j.Date as scheduled_date,
    j.Date_Converted,
    j.SalesPerson,
    j.Job_type,
    -- Calculate total value
    COALESCE(j.One_off_job_dollars, 0) + COALESCE(j.Visit_based_dollars, 0) as job_value,
    j.One_off_job_dollars,
    j.Visit_based_dollars,
    -- Calculate days late
    DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(j.Date), DAY) as days_late
  FROM `jobber_data.v_jobs` j
  WHERE 
    -- Only include jobs that are past their scheduled date
    DATE(j.Date) < CURRENT_DATE('America/New_York')
    -- Exclude jobs that might be completed (this logic may need adjustment)
    AND j.Date_Converted IS NOT NULL
),
-- Join with quotes to get additional client info if needed
job_with_quotes AS (
  SELECT 
    jd.*,
    q.quote_number,
    q.total_dollars as quoted_amount,
    q.status as quote_status
  FROM job_details jd
  LEFT JOIN `jobber_data.v_quotes` q
    ON jd.Job_Number = q.job_numbers
)
SELECT 
  -- Core fields
  Job_Number as job_number,
  Client_Name as name,
  FORMAT_DATE('%Y-%m-%d', DATE(scheduled_date)) as date_of_visit,
  
  -- Next visit date - would need recurring job schedule data
  CAST(NULL AS STRING) as date_of_next_visit,
  
  -- Jobber link - constructed based on pattern
  CONCAT('https://secure.getjobber.com/jobs/', Job_Number) as link_to_job,
  
  -- Financial fields
  job_value as value,
  
  -- Discount - would need to be calculated from quoted vs actual amount
  CASE 
    WHEN quoted_amount IS NOT NULL AND quoted_amount > 0 
    THEN ROUND((quoted_amount - job_value), 2)
    ELSE CAST(NULL AS FLOAT64)
  END as discount_applied,
  
  -- Notes - would require access to job notes/comments from Jobber API
  -- For now, creating a basic summary with available data
  CONCAT(
    'Job scheduled for ', FORMAT_DATE('%b %d, %Y', DATE(scheduled_date)),
    ' (', days_late, ' days late). ',
    'Job type: ', Job_type, '. ',
    'Salesperson: ', SalesPerson, '.'
  ) as notes,
  
  -- Additional useful fields
  days_late,
  Job_type as job_type,
  SalesPerson as salesperson,
  One_off_job_dollars as one_off_value,
  Visit_based_dollars as recurring_value,
  quote_number,
  Date_Converted as date_converted
  
FROM job_with_quotes
-- Sort by most overdue first
ORDER BY days_late DESC, job_value DESC;

-- NOTES FOR IMPLEMENTATION:
-- 1. date_of_next_visit: Requires recurring job schedule data from Jobber API
-- 2. discount_applied: Currently approximated by comparing quote vs job value
-- 3. notes: Would benefit from actual job notes/comments from Jobber
-- 4. AI summary: Would require integration with an AI service (Claude/OpenAI)
-- 5. Missive integration: Would require separate API integration
-- 
-- To get complete data, consider:
-- - Enhancing the Jobber data sync to include job notes and recurring schedules
-- - Adding a Cloud Function to generate AI summaries of job notes
-- - Creating a separate view or table for Missive conversation summaries