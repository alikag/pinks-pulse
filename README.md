# Pink's Pulse Dashboard

A comprehensive business analytics dashboard for Pink's Window Cleaning franchise, tracking quotes, conversions, and sales performance in the Hudson Valley region.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud account with BigQuery access
- Netlify account for deployment
- Service account JSON file from Google Cloud

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/alikag/pinks-pulse.git
cd pinks-dashboard/pinks-dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env` in the root directory:
```env
# BigQuery Configuration
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET=jobber_data

# For local development
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json

# For production (Netlify)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Dashboard Password
VITE_DASHBOARD_PASSWORD=your-secure-password
```

4. **Configure BigQuery**
- Create a Google Cloud project
- Enable BigQuery API
- Create a service account with BigQuery Data Viewer and Job User roles
- Download the service account JSON key
- Create dataset named `jobber_data` with views: `v_quotes`, `v_jobs`, `v_requests`

5. **Run locally**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

## 📋 Documentation

- **[Detailed Calculation Documentation](./DASHBOARD_CALCULATIONS.md)** - Complete formulas and logic for all metrics
- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment instructions
- **[Setup Guide](./setup-guide.md)** - Initial setup and configuration

## 🏗️ Project Structure

```
pinks-dashboard/
├── src/                       # React source files
│   ├── components/           
│   │   ├── Dashboard/        # Dashboard variations (Sales, Premium, etc.)
│   │   ├── Auth/            # Password protection
│   │   └── ui/              # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services and BigQuery integration
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions (haptics, etc.)
├── netlify/                 
│   └── functions/           # Serverless functions
│       ├── dashboard-data-sales.js    # Main data endpoint
│       ├── scrape-google-reviews*.js  # Google Reviews scrapers
│       └── lib/                       # Shared utilities
├── public/                  # Static assets
├── dist/                    # Build output
└── CLAUDE.md               # AI assistant instructions
```

## 🔑 Key Features

### Real-Time KPI Dashboard
- **Live metrics** updated from BigQuery
- **Interactive KPI cards** - click for detailed calculation explanations
- **Smart CVR calculation** - shows last week's rate when no conversions yet
- **Mobile-optimized** with haptic feedback

### Metrics Tracked

#### Daily Metrics
- **Quotes Sent Today** - Target: 12 quotes
- **Converted Today** - Target: $22,500
- **Speed to Lead** - Target: 24 hours

#### Weekly Metrics (Sunday-Saturday)
- **Converted This Week** - Target: $157,500
- **CVR This Week** - Target: 45%
- **Reviews This Week** - Target: 2 reviews
- **Weekly Conversion Rates Chart** - Shows last 6 weeks with "(current)" label

#### Monthly/Long-term
- **30-Day CVR** - Target: 50%
- **Average Quotes/Day** - Target: 12
- **2026 Recurring Revenue** - Target: $1M
- **Next Month OTB** - Dynamically shows month name (e.g., "August OTB")

### Charts & Visualizations
1. **Converted This Week** - Daily breakdown of sent vs converted quotes
2. **Weekly Conversion Rates** - 6-week CVR trend by week
3. **Salesperson Performance** - Individual GM metrics
4. **Monthly OTB** - 12-month revenue forecast
5. **Weekly OTB** - 5-week centered view
6. **Quote Value Flow Waterfall** - Quarter performance visualization

### Google Reviews Integration
- **Live scraping** from Google Maps
- **Fallback data** when scraper fails
- **Auto-scrolling display** of latest reviews
- **Manual override** for review count (currently set to 1)

## 🔧 Recent Updates (July 2024)

### Calculation Changes
- **CVR This Week**: Now calculates (quotes converted this week) ÷ (quotes sent this week)
- **Weekly Conversion Rates**: Shows weekly buckets instead of daily
- **Waterfall Chart**: Tracks all conversions in quarter, not just same-quarter conversions
- **Salesperson Performance**: Includes quotes converted this week regardless of send date

### UI Improvements
- **Mobile spacing**: Increased gap between hamburger menu and title
- **Chart labels**: Added "(current)" to current week in charts
- **Footnotes**: Updated to clarify CVR calculation method
- **Review display**: Added Kathryn Heekin's 5-star review to fallback data

### Performance Fixes
- **Removed expensive timezone conversions** in date comparisons
- **Added error handling** for time series processing
- **Optimized queries** to prevent 502 timeouts
- **Fixed weekly data** to show correct dates (not June dates in July)

## 🚀 Deployment to Netlify

### Initial Setup

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Netlify**
- Log in to Netlify
- Click "New site from Git"
- Choose your GitHub repository
- Build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`

3. **Configure Environment Variables**
In Netlify dashboard > Site settings > Environment variables:
- `BIGQUERY_PROJECT_ID`
- `BIGQUERY_DATASET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (paste entire service account JSON)
- `VITE_DASHBOARD_PASSWORD`

4. **Deploy**
- Netlify auto-deploys on git push
- Manual deploy: Netlify dashboard > "Trigger deploy"

### Custom Domain (Optional)
1. Netlify dashboard > Domain settings
2. Add custom domain
3. Configure DNS as instructed

## 🔒 Security

- **Password protection** - Single password for all users
- **Environment variables** - Never commit sensitive data
- **CORS configured** - Restricts API access
- **Service account** - Limited BigQuery permissions
- **No user data stored** - Read-only dashboard

## 🐛 Troubleshooting

### Common Issues

**502 Errors**
- Check BigQuery credentials in Netlify environment variables
- Ensure service account has proper permissions
- Check function logs in Netlify dashboard

**No Data Showing**
- Verify BigQuery views exist and have data
- Check browser console for errors
- Ensure dates in BigQuery are in correct format

**Google Reviews Not Loading**
- Fallback data will display if scraper fails
- Check Netlify function logs for scraper errors
- Reviews count manually set to 1 until scraper fixed

**Wrong Dates/Timezones**
- All calculations use EST/EDT (America/New_York)
- Week starts Sunday, ends Saturday
- Check BigQuery data has proper timestamps

### Debug Mode
Add `?debug=true` to URL for additional console logging

## 📊 BigQuery Schema

### Required Views

**v_quotes**
- quote_number (STRING)
- sent_date (TIMESTAMP/DATETIME)
- converted_date (TIMESTAMP/DATETIME)
- status (STRING)
- total_dollars (FLOAT64)
- salesperson (STRING)
- client_name (STRING)

**v_jobs**
- Job_Number (STRING)
- Date (DATE)
- Calculated_Value (FLOAT64)
- Job_type (STRING)
- Date_Converted (DATE)

**v_requests**
- quote_number (STRING)
- requested_on_date (TIMESTAMP)
- salesperson (STRING)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- TypeScript for type safety
- Functional React components with hooks
- Tailwind CSS for styling
- Clear comments for complex logic

## 📝 License

This project is private and proprietary to Pink's Window Cleaning.

---

**Need Help?** Contact admin@pinkspulse.com for dashboard access or technical support.