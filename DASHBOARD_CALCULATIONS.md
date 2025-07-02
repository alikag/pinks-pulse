# Pink's Pulse Dashboard - Complete Calculation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Date and Time Handling](#date-and-time-handling)
3. [KPI Cards](#kpi-cards)
4. [Charts and Visualizations](#charts-and-visualizations)
5. [Data Sources](#data-sources)
6. [Recent Changes (July 2024)](#recent-changes-july-2024)
7. [Special Considerations](#special-considerations)

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

### Quarter Definition
- **Q1**: January - March
- **Q2**: April - June  
- **Q3**: July - September
- **Q4**: October - December
- Quarter start calculation:
  ```javascript
  const quarterStartMonth = (currentQuarter - 1) * 3;
  const quarterStart = new Date(currentYear, quarterStartMonth, 1);
  ```

### Date Parsing from BigQuery
- BigQuery dates come as objects: `{ value: "2025-06-27" }`
- UTC timestamps: `"2025-06-27 17:05:33.000000 UTC"`
- Parsing logic handles both formats and converts to EST/EDT with dynamic timezone offset
- Future date protection: Conversions are filtered out if they occur in the future

## KPI Cards

### 1. Quotes Sent Today
- **Calculation**: Count of quotes where `sent_date` = today (EST)
- **Target**: 12 quotes
- **Status**: 
  - Green (success): ≥ 12
  - Yellow (warning): ≥ 8
  - Red (danger): < 8
- **Display**: Shows actual count or "No quotes sent today" if 0

### 2. Converted Today ($)
- **Calculation**: Sum of `total_dollars` for quotes where `converted_date` = today (EST)
- **Target**: $22,500
- **Status**:
  - Green: ≥ $22,500
  - Yellow: > $15,000
  - Normal: ≤ $15,000
- **Display**: Currency format with no decimals

### 3. Converted This Week ($)
- **Calculation**: Sum of `total_dollars` for quotes where `converted_date` is within current week (Sun-Sat)
- **Target**: $157,500
- **Status**:
  - Green: ≥ $157,500
  - Yellow: > $100,000
  - Red: ≤ $100,000

### 4. CVR This Week (%)
- **NEW CALCULATION (July 2024)**: 
  ```
  (Quotes converted this week) ÷ (Quotes sent this week) × 100
  ```
- **Old calculation**: (Quotes sent this week that eventually converted) ÷ (Quotes sent this week) × 100
- **Change rationale**: Shows current week performance by comparing conversions happening this week vs quotes sent this week
- **Target**: 45%
- **Status**:
  - Green: ≥ 45%
  - Yellow: ≥ 30%
  - Red: < 30%

### 5. 2026 Recurring Revenue
- **Calculation**: Sum of `Calculated_Value` for jobs where `Date` is in 2026 AND `Job_type` = "RECURRING"
- **Target**: $1,000,000
- **Status**:
  - Green: ≥ $1,000,000
  - Yellow: ≥ $750,000
  - Red: < $750,000

### 6. Next Month OTB
- **Calculation**: Sum of `Calculated_Value` for jobs where job date is in next calendar month
- **Display**: Dynamic month name (e.g., "August OTB" instead of "Next Month OTB")
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
- **Calculation**: Manually set to 1 (temporary override)
- **Normal calculation**: Count from BigQuery `google_reviews` table
- **Target**: 2 reviews
- **Status**:
  - Green: ≥ 2
  - Yellow: ≥ 1
  - Red: 0

## Charts and Visualizations

### 1. Converted This Week (Line Chart)
- **X-axis**: Days of current week (Sun-Sat) with date labels (e.g., "Mon 7/1")
- **Y-axis**: Count (not dollars)
- **Lines**:
  - Orange line: Quotes sent on each day (count)
  - Blue line: Quotes converted on each day (count)
- **Current day**: Highlighted with pink dots
- **Future days**: Dashed lines
- **Data source**: Uses `currentWeekDaily` time series data

### 2. Weekly Conversion Rates (Bar Chart)
- **NEW FORMAT (July 2024)**: Shows weekly CVR for last 6 weeks
- **X-axis**: Week labels (e.g., "Week of 6/23", "Week of 6/30 (current)")
- **Y-axis**: Conversion rate percentage
- **Calculation for each week**:
  ```
  (Quotes converted in that week) ÷ (Quotes sent in that week) × 100
  ```
- **Current week**: Highlighted in pink with "(current)" label
- **Tooltip**: Shows conversion details (e.g., "5 converted / 20 sent")
- **Footnote**: "*CVR = quotes converted in week ÷ quotes sent in week"

### 3. Speed to Lead Distribution (Donut Chart)
- **Data**: Last 30 days of quotes
- **Buckets**:
  - 0-24 hours (0-1440 min)
  - 1-2 days (1440-2880 min)
  - 2-3 days (2880-4320 min)
  - 3-4 days (4320-5760 min)
  - 4-5 days (5760-7200 min)
  - 5-7 days (7200-10080 min)
  - 7-14 days (10080-20160 min)
  - 14+ days (20160+ min)

### 4. Salesperson Performance (This Week)
- **Filter**: Only shows salespeople with activity this week
- **Metrics per person**:
  - Quotes sent this week
  - Quotes converted this week (NEW: includes all conversions this week, not just from quotes sent this week)
  - Dollar value sent
  - Dollar value converted
  - Conversion rate %
  - Average speed to lead
- **Sort**: By converted dollar value (descending)

### 5. Monthly OTB (Bar Chart)
- **X-axis**: All 12 months of 2025
- **Y-axis**: Dollar amount (formatted as $Xk)
- **Data**: Sum of `Calculated_Value` for jobs in each month
- **Current month**: Highlighted differently

### 6. Weekly OTB (5-Week View)
- **Shows**: 5 weeks centered on current week (2 before, current, 2 after)
- **X-axis**: Week date ranges
- **Y-axis**: Dollar amount
- **Current week**: Highlighted in purple

### 7. Quote Value Flow Waterfall (This Quarter)
- **NEW CALCULATION (July 2024)**: Tracks all conversions in quarter
- **Shows**:
  - Q3 Start: $0
  - Quotes Sent: Value of quotes sent this quarter
  - Converted This Quarter: Value of all quotes converted this quarter (regardless of when sent)
  - Net Position: Combined total
- **Old calculation**: Only showed quotes both sent and converted within same quarter

### 8. Google Reviews
- **Primary source**: Live scraping from Google Maps
- **Fallback**: Static list including Kathryn Heekin's review (July 2, 2024)
- **Display**: 
  - Auto-scrolling carousel
  - Shows author, rating, text, and time
  - Up to 10 most recent reviews

### 9. Recent Converted Quotes
- **Shows**: All quotes that converted this week
- **Sort**: Most recent first
- **Columns**:
  - Date Converted
  - Quote Number (with Jobber link)
  - Client Name
  - Sales Person
  - Total Value

## Data Sources

### Primary BigQuery Views
1. **v_quotes**
   - quote_number (STRING)
   - sent_date (TIMESTAMP)
   - converted_date (TIMESTAMP)
   - status (STRING)
   - total_dollars (FLOAT64)
   - salesperson (STRING)
   - client_name (STRING)
   - job_numbers (STRING)

2. **v_jobs**
   - Job_Number (STRING)
   - Date (DATE)
   - Calculated_Value (FLOAT64)
   - Job_type (STRING)
   - SalesPerson (STRING)

3. **v_requests**
   - quote_number (STRING)
   - requested_on_date (TIMESTAMP)
   - salesperson (STRING)

### Speed to Lead Query
```sql
SELECT 
  r.quote_number,
  r.requested_on_date,
  q.sent_date,
  q.salesperson,
  TIMESTAMP_DIFF(
    TIMESTAMP(q.sent_date), 
    TIMESTAMP(r.requested_on_date), 
    MINUTE
  ) as minutes_to_quote
FROM v_requests r
JOIN v_quotes q ON r.quote_number = q.quote_number
WHERE q.sent_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 35 DAY)
```

## Recent Changes (July 2024)

### Calculation Updates
1. **CVR This Week**: Changed from "quotes sent this week that converted" to "quotes converted this week ÷ quotes sent this week"
2. **Weekly Conversion Rates Chart**: Changed from daily view to weekly buckets (last 6 weeks)
3. **Waterfall Chart**: Now tracks all conversions in quarter, not just same-quarter conversions
4. **Salesperson Performance**: Includes all conversions this week, not just from quotes sent this week
5. **Converted This Week Chart**: Changed from dollar values to quote counts

### UI Updates
1. **Next Month OTB**: Shows actual month name (e.g., "August OTB")
2. **Weekly Charts**: Current week labeled with "(current)"
3. **Mobile Spacing**: Improved hamburger menu spacing
4. **Chart Footnotes**: Updated to clarify calculations

### Performance Optimizations
1. **Removed timezone conversions**: parseDate already handles EST conversion
2. **Error handling**: Added try-catch for time series processing
3. **Separate data structures**: `currentWeekDaily` for daily view, `week` for weekly CVR

### Data Fixes
1. **Google Reviews**: Manually set count to 1, added Kathryn Heekin's review to fallback
2. **Week dates**: Fixed to show current week dates instead of June dates in July

## Special Considerations

### 1. Status Handling
- Accepts variations: "Converted", "Won", "Accepted", "Complete"
- Case-insensitive comparison
- Checks both status field and presence of converted_date

### 2. Week Boundary Edge Cases
- Weeks always start Sunday 00:00:00 EST
- Weeks always end Saturday 23:59:59 EST
- Calculations respect daylight saving time transitions

### 3. Performance Optimizations
- Parallel query execution (quotesQuery, jobsQuery, speedToLeadQuery)
- 9-second timeout on queries to prevent Netlify function timeout
- Direct date comparisons without timezone conversion in loops

### 4. Interactive Features
- **Click any KPI card**: Shows detailed calculation modal
- **Modal displays**:
  - SQL-like formula
  - Plain English description
  - Important notes and context
- **Haptic feedback**: On all mobile interactions

### 5. Error Handling
- Graceful fallbacks for missing data
- Empty data structures returned on processing errors
- Console logging for debugging with meaningful prefixes

### 6. Mobile Responsiveness
- Touch-optimized with haptic feedback
- Responsive font sizes (text-sm on mobile, up to text-7xl on desktop)
- Charts adapt to screen size
- Hamburger menu with proper spacing

## Replication Guide

To replicate this dashboard:

1. **Set up BigQuery**
   - Create project and enable BigQuery API
   - Create service account with BigQuery Data Viewer and Job User roles
   - Create `jobber_data` dataset
   - Create views: v_quotes, v_jobs, v_requests

2. **Configure Environment**
   ```env
   BIGQUERY_PROJECT_ID=your-project-id
   BIGQUERY_DATASET=jobber_data
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   VITE_DASHBOARD_PASSWORD=your-password
   ```

3. **Deploy to Netlify**
   - Connect GitHub repository
   - Set environment variables
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Test Calculations**
   - Verify timezone handling (EST/EDT)
   - Test week boundaries
   - Check quarter transitions
   - Validate CVR calculations

5. **Monitor Performance**
   - Check Netlify function logs for timeouts
   - Monitor BigQuery query performance
   - Verify data freshness

Each calculation has been carefully designed and tested to provide accurate insights for the window cleaning business operations.