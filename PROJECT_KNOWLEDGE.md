# Pink's Pulse Dashboard - Project Knowledge Document

## Project Overview
Pink's Pulse is a comprehensive business analytics dashboard for Pink's Window Cleaning franchise in the Hudson Valley region. It tracks quotes, conversions, sales performance, and other key metrics for the window cleaning business.

## Key Business Context
- **Business**: Pink's Window Cleaning (Hudson Valley franchise)
- **Users**: General Managers (GMs) who receive quote requests and convert them to jobs
- **Critical Metrics**:
  - QPD (Quotes Per Day) - Target: 12
  - CVR (Conversion Rate) - Quotes converted to jobs
  - Speed to Lead - Time between quote request and quote sent
  - OTB (On The Books) - Scheduled revenue for future periods
- **Week Definition**: Sunday-Saturday (not Monday-Sunday)

## Technical Architecture

### Frontend
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Chart.js, Recharts
- **State Management**: React hooks
- **Deployment**: Netlify

### Backend
- **Functions**: Netlify Functions (serverless)
- **Database**: Google BigQuery
- **Project ID**: `jobber-data-warehouse-462721`
- **Dataset**: `jobber_data`
- **Main Tables**:
  - `v_quotes` - Quote data
  - `v_jobs` - Job data
  - `v_requests` - Quote request data
  - `google_reviews` - Customer reviews (manual data integration)

## Critical User Requirements

### 1. NO PLACEHOLDER DATA
The user was extremely clear: "DO NOT USE PLACEHOLDER DATA, FIGURE OUT SOLUTIONS THAT ARE SCALABLE"
- All charts must show real data or "No data available" messages
- Never use mock/fallback data
- Business reports must be accurate

### 2. Date Handling
- BigQuery returns dates as objects: `{value: "2025-06-27"}`
- All dates must be parsed correctly
- Week calculations must be Sunday-Saturday
- Timezone: EST/EDT

### 3. Conversion Rate Calculation
- CVR = (Quotes sent in period that were converted / Total quotes sent in period) × 100
- Track quotes by sent date, not conversion date
- A quote sent this week that converts next week counts toward this week's CVR

## Recent Work Completed

### 1. Removed All Placeholder Data
- Updated Google Reviews to show empty state when no data
- Fixed Weekly OTB chart to use real data only
- Added empty state for Revenue Waterfall chart
- Updated Reviews This Week KPI to show actual count (0)
- Removed all mock data from functions

### 2. Fixed Speed to Lead Distribution
Previous ranges were too granular for short times but not enough for long times. Updated to:
- 0-1 hr (Excellent) - Green
- 1-4 hrs (Good) - Blue
- 4-8 hrs (Fair) - Yellow
- 8-24 hrs (Needs Improvement) - Orange
- 1-2 days (Poor) - Red
- 2+ days (Critical) - Dark Red

### 3. Fixed Weekly OTB Calculation
The calculation was incorrectly assigning jobs to weeks. Now properly calculates Sunday-Saturday weeks:
- Week 1: July 1-5 (Tue-Sat)
- Week 2: July 6-12 (Sun-Sat)
- Week 3: July 13-19 (Sun-Sat)
- etc.

### 4. Google Reviews Integration
- Set up to pull from BigQuery table: `jobber-data-warehouse-462721.jobber_data.google_reviews`
- Created import script for manual data entry
- Handles string rating values
- Shows average rating and total count
- **Note**: No live integration with Google Reviews API - requires manual data entry

## Critical Business Logic: Conversion Date Tracking

### Quote Approval vs Job Creation
- **Business Process**: Quotes are approved by customers, then jobs are created in the system
- **Data Challenge**: Quote approval date ≠ Job creation date
- **Solution**: Dynamic lookup of job conversion dates using correlated subquery
- **Implementation**: 
  ```sql
  COALESCE(
    (SELECT CAST(j.Date_Converted AS DATE)
     FROM v_jobs j 
     WHERE CAST(j.Job_Number AS STRING) = q.job_numbers 
     LIMIT 1),
    q.converted_date
  )
  ```
- **Impact**: "Converted Today" and "Converted This Week" metrics now reflect when jobs were actually created
- **Performance**: Subquery approach avoids JOIN timeouts and scales with data volume

### Why This Matters
- Example: Quote #676 was approved June 30th but job was created July 1st
- Without the JOIN: Shows as converted July 1st (incorrect for business metrics)
- With the JOIN: Shows as converted when the job was actually created
- This ensures conversion metrics align with operational reality

## Known Issues & TODOs

### 1. Google Reviews Data Integration
- Currently no live feed between Google Reviews and BigQuery
- Requires manual data import
- Import script created at: `import-reviews-to-bigquery.sql`
- Sample data available in: `google_reviews.json`

### 2. Reviews This Week Metric
- Currently hardcoded to 0
- Needs integration with actual review timestamps
- Should count reviews posted in current Sunday-Saturday week

### 3. Quote Value Flow Waterfall Chart
- Currently shows empty state
- Renamed from "Revenue Waterfall" to "Quote Value Flow Waterfall" 
- Tracks the flow of quote values through the conversion process
- Expected flow: Quarter Start → Quotes Sent → Not Converted → Converted → Adjustments → Quarter Final
- Needs quarterly quote data aggregation in backend

### 4. Bundle Size Warning
- Main JavaScript bundle is >500KB
- Consider code splitting for better performance

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=/.netlify/functions
VITE_DASHBOARD_PASSWORD=your-password
```

### Netlify Environment Variables
```
BIGQUERY_PROJECT_ID=jobber-data-warehouse-462721
BIGQUERY_DATASET=jobber_data
GOOGLE_APPLICATION_CREDENTIALS_JSON={...service account JSON...}
```

## Key Files & Their Purpose

### Dashboard Components
- `/src/components/Dashboard/SalesKPIDashboard.tsx` - Main dashboard UI
- `/src/types/dashboard.ts` - TypeScript interfaces
- `/src/hooks/useDashboardData.ts` - Data fetching hook

### Backend Functions
- `/netlify/functions/dashboard-data-sales.js` - Main data aggregation
- `/netlify/functions/google-reviews-bigquery.js` - Google Reviews data

### Configuration
- `/netlify.toml` - Netlify configuration
- `/CLAUDE.md` - Project-specific instructions
- `/README.md` - General project documentation

## Testing & Debugging

### Common Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linting
npm run typecheck    # Check TypeScript
```

### Debugging Tips
1. Check browser console for `[Google Reviews] Fetch result:` logs
2. Check Netlify function logs for `[Google Reviews BigQuery]` entries
3. Look for `[OTB Week Debug]` logs to verify week calculations
4. Speed to lead logs show distribution across time ranges

## Security Notes
- Never expose API keys in code
- Google API keys have been rotated after exposure
- All sensitive data in environment variables
- BigQuery uses service account authentication

## Future Enhancements

### 1. Google Reviews Integration
Build automated data pipeline to sync Google Reviews to BigQuery:
- Use Google My Business API or Places API
- Schedule regular syncs (daily/hourly)
- Update review counts and ratings automatically

### 2. Real-time Updates
- Implement WebSocket or polling for live data
- Add refresh indicators
- Show last updated timestamps

### 3. Additional Metrics
- Customer lifetime value
- Seasonal trends
- Geographic distribution
- Service type breakdown

## Contact & Context
This dashboard is critical for Pink's Window Cleaning operations. GMs rely on it for daily decision-making. Accuracy is paramount - never show fake data.

---

Last Updated: December 27, 2024
By: Claude (AI Assistant) working with Alika Graham