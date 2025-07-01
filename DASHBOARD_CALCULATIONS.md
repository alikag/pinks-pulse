# Pink's Pulse Dashboard - Complete Calculation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Date and Time Handling](#date-and-time-handling)
3. [KPI Cards](#kpi-cards)
4. [Charts and Visualizations](#charts-and-visualizations)
5. [Data Sources](#data-sources)
6. [Special Considerations](#special-considerations)

## Overview

Pink's Pulse is a real-time business analytics dashboard for Pink's Window Cleaning franchise in the Hudson Valley. This document provides detailed calculations for every metric and visualization.

## Date and Time Handling

### Timezone
- **All calculations use EST/EDT timezone** (America/New_York)
- **Dynamic timezone offset**: Automatically switches between EST (-05:00) and EDT (-04:00) based on daylight saving time
- Server timestamps are converted to EST/EDT using: `new Date().toLocaleString("en-US", {timeZone: "America/New_York"})`
- Date parsing uses dynamic offset: `getESTOffset()` returns `-04:00` during DST, `-05:00` during standard time
- This ensures consistency regardless of server location and season

### Week Definition
- **Weeks run Sunday through Saturday**
- Week start calculation:
  ```javascript
  const weekStart = new Date(estToday);
  weekStart.setDate(estToday.getDate() - estToday.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  ```

### Date Parsing from BigQuery
- BigQuery dates come as objects: `{ value: "2025-06-27" }`
- UTC timestamps: `"2025-06-27 17:05:33.000000 UTC"`
- Parsing logic handles both formats and converts to EST/EDT with dynamic timezone offset
- Future date protection: Conversions are filtered out if they occur in the future (including later on the same day)

## KPI Cards

### 1. Quotes Sent Today
- **Calculation**: Count of quotes where `sent_date` = today (EST)
- **Target**: 12 quotes
- **Status**: 
  - Green (success): ≥ 12
  - Yellow (warning): ≥ 6
  - Red (danger): < 6
- **Display**: Shows actual count or "No quotes sent today" if 0

### 2. Converted Today ($)
- **Calculation**: Sum of `total_dollars` for quotes where job's `Date_Converted` = today (EST/EDT) AND not in the future
- **Data Source**: Uses v_jobs.Date_Converted (when job was created) via LEFT JOIN, not v_quotes.converted_date
- **Note**: Tracks when jobs were actually created in the system, not just when quotes were approved
- **Why**: A quote may be approved on one day but the job created the next day - we track job creation as the true conversion
- **Future Protection**: Excludes conversions with timestamps later than current EST/EDT time
- **Target**: $100,000
- **Status**:
  - Green: ≥ $100,000
  - Yellow: ≥ $50,000
  - Red: < $50,000
- **Display**: Currency format with no decimals

### 3. Converted This Week ($)
- **Calculation**: Sum of `total_dollars` for quotes where job's `Date_Converted` is within current week (Sun-Sat) AND not in the future
- **Data Source**: Uses v_jobs.Date_Converted (when job was created) via LEFT JOIN, not v_quotes.converted_date
- **Future Protection**: Excludes conversions with timestamps later than current EST/EDT time
- **Subtitle**: Shows count and dollar value (e.g., "4 quotes - $5,384")
- **Target**: $157,500
- **Status**:
  - Green: ≥ $157,500
  - Yellow: ≥ $100,000
  - Red: < $100,000

### 4. CVR This Week (%)
- **IMPORTANT**: This is different from "Weekly CVR % (by Send Date)" chart
- **Calculation**: 
  ```
  (Quotes sent this week that have converted) ÷ (Total quotes sent this week) × 100
  ```
- **Smart Logic**: If no quotes sent this week have converted yet, shows last week's CVR as reference
- **Indicator**: Shows "*Using last week's rate" when using fallback
- **Target**: 45%
- **Status**:
  - Green: ≥ 45%
  - Yellow: ≥ 30%
  - Red: < 30%

### 5. 2026 Recurring Revenue
- **Calculation**: Sum of recurring revenue scheduled for 2026
- **Target**: $1,000,000
- **Status**:
  - Green: ≥ $1,000,000
  - Yellow: ≥ $750,000
  - Red: < $750,000

### 6. Next Month OTB
- **Calculation**: Sum of `Calculated_Value` for jobs where job date is in next calendar month
- **Target**: $125,000
- **Status**:
  - Green: ≥ $125,000
  - Yellow: ≥ $100,000
  - Red: < $100,000

### 7. Speed to Lead (30D Avg)
- **Calculation**: Average minutes between `requested_on_date` and `sent_date` for last 30 days
- **Target**: 24 hours (1440 minutes)
- **Status**:
  - Green: ≤ 24 hours
  - Yellow: ≤ 48 hours
  - Red: > 48 hours
- **Display**: Formatted as hours/minutes (e.g., "2h 45m")

### 8. 30D CVR (%)
- **Calculation**: 
  ```
  (Quotes sent in last 30 days that have converted) ÷ (Total quotes sent in last 30 days) × 100
  ```
- **Subtitle**: Shows conversion count (e.g., "77/140 converted")
- **Target**: 50%
- **Status**:
  - Green: ≥ 50%
  - Yellow: ≥ 35%
  - Red: < 35%

### 9. Avg Quotes/Day (30D)
- **Calculation**: Total quotes sent in last 30 days ÷ 30
- **Target**: 12 quotes/day
- **Status**:
  - Green: ≥ 12
  - Yellow: ≥ 6
  - Red: < 6

### 10. Reviews This Week
- **Calculation**: Count of Google reviews where review date is within current week
- **Target**: 2 reviews
- **Status**:
  - Green: ≥ 2
  - Yellow: ≥ 1
  - Red: 0

## Charts and Visualizations

### 1. Converted This Week (Line Chart)
- **X-axis**: Days of current week (Sun-Sat) with date labels (e.g., "Mon 6/30")
- **Y-axis**: Dollar amount
- **Lines**:
  - Blue line: Quotes sent on each day (by count)
  - Green line: Quotes converted on each day (by dollar value)
- **Calculation**: For each day, count quotes where `sent_date` = that day and sum dollars where `converted_date` = that day

### 2. Weekly CVR % (by Send Date) - Bar Chart
- **IMPORTANT**: Different from "CVR This Week" KPI
- **X-axis**: Days of current week (Sun-Sat)
- **Y-axis**: Conversion rate percentage
- **Calculation for each day**:
  ```
  (Quotes sent on that day that eventually converted) ÷ (Total quotes sent on that day) × 100
  ```
- **Note**: "*By send date, not conversion date" - Today's quotes typically show 0% until they convert
- **Header**: Shows week average CVR

### 3. Speed to Lead Distribution (Donut Chart)
- **Data**: Last 30 days of quotes
- **Buckets**:
  - 0-24 hours
  - 1-2 days
  - 2-3 days
  - 3-4 days
  - 4-5 days
  - 5-7 days
  - 7-14 days
  - 14+ days
- **Calculation**: For each quote, calculate minutes between request and send, categorize into buckets

### 4. Salesperson Performance (This Week)
- **Filter**: Only shows salespeople with activity this week
- **Metrics per person**:
  - Quotes sent this week
  - Quotes converted (sent this week that have converted)
  - Dollar value sent
  - Dollar value converted
  - Conversion rate %
  - Average speed to lead
- **Sort**: By converted dollar value (descending)
- **Visualization**: Horizontal bar chart showing converted dollars

### 5. Monthly OTB (Bar Chart)
- **X-axis**: Months (Jan-Dec 2025)
- **Y-axis**: Dollar amount
- **Calculation**: Sum of `Calculated_Value` for jobs in each month
- **Includes**: All jobs (past, present, and future) for current year

### 6. Weekly OTB (This Month) - Bar Chart
- **Shows**: 5 weeks centered on current week
- **X-axis**: Week labels (e.g., "Jun 9-15")
- **Y-axis**: Dollar amount
- **Current week**: Highlighted in purple
- **Calculation**: Sum of job values for each Sunday-Saturday week

### 7. Google Reviews
- **Source**: BigQuery table `jobber_data.google_reviews`
- **Display**: Average rating, total count, and scrolling recent reviews
- **Metrics**:
  - Average rating (1-5 stars)
  - Total review count
  - Recent reviews with author, rating, text, and relative time

### 8. Converted Quotes Table
- **Shows**: Quotes that converted this week
- **Columns**:
  - Date Converted
  - Quote Number (clickable Jobber link)
  - Client Name
  - Sales Person
  - Job Type
  - Total Value
- **Sort**: Most recent conversions first
- **Jobber Links**: Decoded from base64 GraphQL IDs

### 9. Top $ Not Converted Table
- **Shows**: Highest value quotes that haven't converted
- **Filter**: Status = "Awaiting Response"
- **Columns**: Same as Converted Quotes table
- **Sort**: By dollar value (descending)
- **Limit**: Top 10

## Data Sources

### Primary Tables
1. **v_quotes**: Quote data including status, dates, and values
2. **v_jobs**: Job scheduling and OTB calculations
3. **google_reviews**: Customer review data

### Dynamic Job Conversion Date Lookup
- **Purpose**: Get accurate conversion dates from jobs table
- **Implementation**: Correlated subquery for scalable performance
  ```sql
  COALESCE(
    (SELECT CAST(j.Date_Converted AS DATE)
     FROM v_jobs j 
     WHERE CAST(j.Job_Number AS STRING) = q.job_numbers 
     LIMIT 1),
    q.converted_date
  )
  ```
- **Why**: Quote approval date ≠ Job creation date
- **Benefits**: 
  - No timeout issues from large JOINs
  - Scales with data volume
  - Only looks up job data when needed
- **Result**: Conversion metrics reflect when jobs were created, not just quote approval

### Speed to Lead Calculation
```sql
WITH speed_data AS (
  SELECT 
    r.quote_number,
    r.requested_on_date,
    q.sent_date,
    TIMESTAMP_DIFF(TIMESTAMP(q.sent_date), TIMESTAMP(r.requested_on_date), MINUTE) as minutes_to_quote
  FROM requests r
  JOIN quotes q ON r.quote_number = q.quote_number
)
```

## Special Considerations

### 1. CVR Calculation Differences
- **CVR This Week (KPI)**: Overall week performance, may use last week's data as fallback
- **Weekly CVR % Chart**: Daily breakdown by send date, shows 0% for recent days

### 2. Status Handling
- Accepts multiple status variations: "Converted", "Won", "Accepted", "Complete"
- Case-insensitive comparison
- Falls back to checking if `converted_date` exists

### 3. Week Boundary Handling
- All week calculations align to Sunday-Saturday
- Current week is always Sunday of current week through Saturday
- Historical data respects these same boundaries

### 4. Performance Optimizations
- Parallel query execution to avoid timeouts
- Caching of dashboard data (15-minute TTL)
- Minimal data transformations in frontend

### 5. Interactive Calculation Details
- **Click any KPI card** to view detailed calculation information
- **Modal displays**:
  - SQL/logic formula (e.g., `COUNT(quotes WHERE DATE(sent_date) = TODAY_EST)`)
  - Plain English description of how the calculation works
  - Important notes about targets, data sources, or special behaviors
- **Transparency**: Users can understand exactly how each metric is calculated
- **Accessibility**: Calculation details help users trust and verify the data

### 6. Mobile Responsiveness
- Haptic feedback on interactions
- Adjusted layouts for mobile screens
- Touch-optimized controls
- Responsive charts that adapt to screen size
- Weekly OTB chart properly displays all 5 weeks on mobile

### 7. Error Handling
- Graceful fallbacks for missing data
- Type-safe calculations with null checks
- User-friendly error messages

## Replication Guide

To replicate this dashboard:

1. **Set up BigQuery** with required tables and views
2. **Implement date handling** with EST timezone consistency
3. **Calculate KPIs** following exact formulas above
4. **Create visualizations** with specified groupings and calculations
5. **Apply business logic** including CVR fallbacks and status variations
6. **Test edge cases** like week boundaries and null values
7. **Optimize performance** with parallel queries and caching

Each calculation has been designed to provide meaningful insights for the window cleaning business, with special attention to conversion tracking and revenue forecasting.