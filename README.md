# Pink's Pulse Dashboard

A comprehensive business analytics dashboard for Pink's Window Cleaning franchise, tracking quotes, conversions, and sales performance in the Hudson Valley region.

## Documentation

- **[Detailed Calculation Documentation](./DASHBOARD_CALCULATIONS.md)** - Complete formulas and logic for all metrics
- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment instructions
- **[Setup Guide](./setup-guide.md)** - Initial setup and configuration

## Google Reviews Configuration
- Reviews are scraped directly from Google Maps in real-time
- Uses Playwright scraper at `/.netlify/functions/scrape-google-reviews-playwright`
- No API keys or manual updates required
- Automatically fetches latest reviews every time dashboard loads
- Displays up to 10 most recent reviews with automatic scrolling
- Shows actual Google Maps ratings and review counts

## Features

- Real-time KPI tracking and analytics for window cleaning business
- Quote-to-job conversion metrics and trends
- Sales performance visualization by individual GMs
- Speed to lead tracking (response time to quote requests)
- Weekly performance metrics (Sunday-Saturday)
- On-the-books (OTB) revenue tracking
- Responsive design for desktop and mobile
- Integration with BigQuery for data storage
- Google Reviews scraper for business insights

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Chart.js, Recharts
- **Backend**: Node.js + Express
- **Database**: Google BigQuery
- **Deployment**: Netlify (Frontend) + Netlify Functions (Backend)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud account with BigQuery access
- Netlify account for deployment

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pinks-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:3001/api
VITE_DASHBOARD_PASSWORD=your-password
```

4. For the backend server, create a `.env` file in the `/server` directory:
```env
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET=your-dataset
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account-key.json
```

### Development

1. Start the development server:
```bash
npm run dev
```

2. In a separate terminal, start the backend server:
```bash
cd server
npm install
npm start
```

3. Open http://localhost:5173 in your browser

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Netlify

1. Push your code to GitHub
2. Connect your GitHub repository to Netlify
3. Configure environment variables in Netlify dashboard
4. Deploy with automatic builds on push

## Project Structure

```
pinks-dashboard/
├── src/                    # React source files
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   └── types/             # TypeScript types
├── netlify/               # Netlify Functions
│   └── functions/         # Serverless functions
│       ├── dashboard-*    # Dashboard data endpoints
│       └── scrape-*       # Google Reviews scrapers
├── server/                # Express backend server
├── public/                # Static assets
└── dist/                  # Build output
```

## Environment Variables

### Frontend (Vite)
- `VITE_API_URL`: Backend API endpoint
- `VITE_DASHBOARD_PASSWORD`: Dashboard access password

### Backend
- `BIGQUERY_PROJECT_ID`: Google Cloud project ID
- `BIGQUERY_DATASET`: BigQuery dataset name
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON (local)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Service account JSON string (production)

## Security

- Password protection for dashboard access
- Environment variables for sensitive configuration
- CORS configuration for API security
- Service account credentials for BigQuery access

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Google Reviews Scraper

The project includes Google Reviews scraping functionality with two implementations:

### 1. Simple Fetch Scraper
- Location: `/netlify/functions/scrape-google-reviews.js`
- Method: Basic HTTP fetch
- Limitations: Limited effectiveness with dynamic content

### 2. Playwright Scraper
- Location: `/netlify/functions/scrape-google-reviews-playwright.js`
- Method: Headless browser automation
- Features: Handles dynamic content, extracts ratings, reviews, and business info
- Dependencies: `playwright-chromium`

### Testing the Scrapers

Use the test interface at `/test-google-reviews.html` or call the API endpoints directly:

```bash
# Simple fetch version
curl https://your-domain/.netlify/functions/scrape-google-reviews

# Playwright version (recommended)
curl https://your-domain/.netlify/functions/scrape-google-reviews-playwright
```

### Recent Updates (July 2025)

#### Latest Features
- **KPI Calculation Context**: Click any KPI card to see detailed calculation formulas, explanations, and notes
- **Logout Functionality**: Added subtle logout button in sidebar menu
- **Improved Mobile Charts**: Fixed Weekly OTB chart to display all 5 weeks properly on mobile
- **Enhanced Sidebar**: Larger logo (h-12 w-12) for better visibility
- **Real-time Google Reviews**: Now scrapes reviews directly from Google Maps instead of BigQuery

#### Dashboard UI Improvements
- **Typography**: DDC Hardware industrial font style for Pink's branding
- **Responsive Design**: Larger text on desktop (up to 7xl), mobile optimizations
- **Color Scheme**: Consistent pink (#F9ABAC) hover effects throughout
- **Navigation**: Clickable header scrolls to top, mobile menu slides with content
- **Password Page**: Larger logo (h-40 w-40), overflow prevention, email link for admin contact
- **Interactive KPIs**: All KPI cards are clickable to show calculation details

#### Data Accuracy Enhancements
- **Smart CVR Logic**: Shows last week's CVR when current week has no conversions yet
- **Status Flexibility**: Handles "Converted", "Won", "Accepted", "Complete" statuses
- **Timezone Consistency**: All calculations in EST/EDT (America/New_York)
- **Week Boundaries**: Sunday-Saturday weeks throughout the system
- **Parallel Queries**: Prevents 502 timeouts on data fetching

#### Key Metrics and Targets
- **Quotes Sent Today**: Target 12 quotes daily
- **Converted Today**: $100k target (quotes converting today)
- **Converted This Week**: $157.5k target (Sunday-Saturday)
- **CVR This Week**: 45% target (with smart fallback logic)
- **2026 Recurring**: $1M annual target
- **Speed to Lead**: 24-hour target (was 30 minutes)
- **30D CVR**: 50% target (was 45%)
- **Reviews This Week**: 2 review target (was 4)

#### Technical Improvements
- **Base64 Decoding**: Jobber GraphQL IDs properly decoded for links
- **Date Parsing**: Handles BigQuery date objects and UTC timestamps
- **Haptic Feedback**: Touch feedback on all mobile interactions
- **Type Safety**: TypeScript with proper null checks
- **Performance**: 15-minute cache, optimized queries
- **Responsive Charts**: Window resize handling for optimal mobile display

#### KPI Calculation Details
Each KPI now displays:
- **Formula**: Exact SQL/logic used in backend (e.g., `COUNT(quotes WHERE DATE(sent_date) = TODAY_EST)`)
- **Description**: Plain English explanation of the calculation
- **Notes**: Additional context like targets, special behaviors, or data sources

#### CVR Calculation Clarification
- **CVR This Week (KPI Card)**: Overall weekly conversion rate, may show last week's rate if no conversions yet
- **Weekly CVR % Chart**: Daily breakdown showing conversion rate for quotes sent each specific day
- Both metrics serve different purposes - one for current performance, one for daily trends

## License

This project is private and proprietary.