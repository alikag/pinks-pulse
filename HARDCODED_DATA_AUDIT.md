# Hardcoded Data Audit - Pink's Pulse Dashboard

## Date: December 27, 2024
## Status: CRITICAL - Dashboard goes live tomorrow

## Fixed Issues ✅
1. **Monthly OTB Chart** - Now using real data from BigQuery
2. **Speed to Lead Distribution** - Using real data with proper ranges
3. **Google Reviews** - Removed all placeholder reviews
4. **Mock Data Fallback** - Removed getMockDashboardData, now returns proper error
5. **Sparkline Data** - Removed random generation, set to undefined
6. **Daily Trend Chart** - Set to 0 values with TODO comment
7. **Heatmap Activity** - Set to 0 values with TODO comment

## Remaining Hardcoded Values ⚠️

### 1. KPI Target Values (SalesKPIDashboard.tsx)
These are business targets that should be configurable:
- **Quotes Sent Today**: Target 12
- **Converted Today**: Target $22,500
- **Converted This Week**: Target $157,500
- **CVR This Week**: Target 45%
- **2026 Recurring**: Target $85k
- **Next Month OTB**: Target $125k
- **Speed to Lead**: Target 30 min
- **30D CVR**: Target 45%
- **Avg Quotes/Day**: Target 12
- **Reviews This Week**: Target 4

**Recommendation**: These should come from environment variables or a configuration table in BigQuery.

### 2. Reviews Count (dashboard-data-sales.js line 643)
```javascript
reviewsThisWeek: 0 // Real reviews count not available from BigQuery yet
```
**Impact**: Reviews This Week KPI always shows 0
**Solution**: Query the google_reviews table for reviews in current week

### 3. Empty Data Visualizations
- **Daily Trend Sparkline**: Shows flat line (all zeros)
- **Time of Day Heatmap**: Shows no activity (all zeros)
- **KPI Sparklines**: All undefined (no historical trend)

**Impact**: These charts provide no value to users
**Solution**: Either hide these charts or implement backend queries for:
  - Hourly quote distribution (last 24 hours)
  - Quote activity by hour of day and day of week
  - 7-day historical trends for each KPI

## Recommendations for Go-Live

### MUST FIX Before Launch:
1. **Reviews Count** - Easy fix, query google_reviews table
2. **Hide Empty Charts** - Better to hide than show empty data

### Should Fix Soon:
1. **Configurable Targets** - Move to environment variables
2. **Historical Data** - Implement backend queries for trends

### Nice to Have:
1. **Real-time Updates** - WebSocket or polling
2. **Data Quality Indicators** - Show data freshness

## Implementation Priority
1. Fix reviews count (5 minutes)
2. Hide empty charts or add "No data available" messages (10 minutes)
3. Document target values for client approval (15 minutes)

## Notes
- All critical mock data has been removed
- Dashboard now shows real data or nothing
- Error handling improved - no fake data on errors
- Ready for production with minor fixes noted above