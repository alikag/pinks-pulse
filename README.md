# Pinks Dashboard

A comprehensive business analytics dashboard for tracking quotes, conversions, and sales performance.

## Features

- Real-time KPI tracking and analytics
- Quote conversion metrics and trends
- Sales performance visualization
- Responsive design for desktop and mobile
- Password-protected access
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

### Recent Updates

- Fixed TypeScript build errors in SalesKPIDashboard component
- Installed Playwright dependencies for Google Reviews scraper
- Removed Puppeteer implementation to reduce complexity
- Updated scraper timeout handling for better reliability

## License

This project is private and proprietary.