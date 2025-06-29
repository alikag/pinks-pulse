# Changelog

All notable changes to Pink's Pulse Dashboard will be documented in this file.

## [1.1.0] - 2025-06-28

### Added
- Weekly salesperson performance tracking (separate from all-time stats)
- Debug endpoints for troubleshooting date calculations
- Comprehensive logging for BigQuery data processing
- TypeScript type for `salespersonsThisWeek` data

### Changed
- Dashboard header: "Sales Analytics" → "Pink's Pulse - Hudson Valley KPI Report"
- KPI label: "30D AVG QPD" → "Avg Quotes/Day (30D)"
- KPI label: "30D Speed to Lead" → "Response Time (30D Avg)"
- Sidebar icon: Chart icon → Pink's logo (logo.jpeg)
- "Conversion Cohort Analysis" → "Salesperson Performance (This Week)"
- Chart now shows only active salespeople for current week

### Removed
- Period selector buttons (Today/Week/Month/Quarter)
- Top-right navigation icons (Bell, Help, Profile avatar)
- Team, Goals, and Live Feed navigation items
- Forecast indicators and projected totals
- "Today's Performance" widget in sidebar
- Inactive salespeople from weekly performance chart

### Fixed
- BigQuery date parsing - dates are returned as objects with `value` property
- CVR calculation now correctly tracks quotes sent in a period that were converted
- "Converted This Week" chart showing empty data
- QPD (Quotes Per Day) showing as zero
- Week calculations to consistently use Sunday-Saturday
- Y-axis labels showing dollar values instead of quote counts
- Timezone issues causing date misalignment
- "Invalid time value" error when processing BigQuery data

### Technical Details
- Updated `parseDate()` function to handle BigQuery date format: `{ value: "2025-06-27" }`
- Added `salespersonsThisWeek` tracking in backend data processing
- Fixed temporal dead zone error by moving `generateSparklineData` function
- Updated all time series functions to use consistent date parsing
- Added error handling for invalid dates in BigQuery responses

## [1.0.0] - 2025-06-27

### Initial Release
- Real-time KPI dashboard for window cleaning business
- BigQuery integration for data storage
- Quote-to-job conversion tracking
- Sales performance visualization
- Google Reviews scraper integration
- Responsive design with Tailwind CSS
- Password-protected access