# Vercel Deployment Guide

## Overview
This project is configured to deploy both the frontend React app and backend API to Vercel using serverless functions.

## Repository Structure
```
pinks-dashboard/
├── api/                    # Vercel serverless functions
│   └── index.js           # Main API handler
├── dist/                  # Built frontend files (generated)
├── server/                # Original Express server (for local dev)
├── src/                   # React frontend source
├── package.json           # Root package.json with all dependencies
└── vercel.json           # Vercel configuration
```

## Deployment Steps

### 1. Environment Variables
Set these environment variables in your Vercel project settings:

```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON=<your-service-account-json>
BIGQUERY_PROJECT_ID=jobber-data-warehouse-462721
BIGQUERY_DATASET=jobber_data
```

**Important**: The `GOOGLE_APPLICATION_CREDENTIALS_JSON` should be the entire JSON content of your service account key file, not a file path.

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Option B: Using Git Integration
1. Push your code to GitHub/GitLab/Bitbucket
2. Import the project in Vercel dashboard
3. Set the root directory to the project folder
4. Vercel will automatically detect the configuration

### 3. Configuration Details

The `vercel.json` file configures:
- Serverless functions in the `/api` directory
- API routes are handled by `/api/index.js`
- Static files are served from the `dist` directory
- All `/api/*` requests are routed to the serverless function

### 4. API Endpoints

After deployment, your API will be available at:
- `https://your-project.vercel.app/api/health` - Health check
- `https://your-project.vercel.app/api/test-bigquery` - Test BigQuery connection
- `https://your-project.vercel.app/api/check-views` - Check BigQuery views
- `https://your-project.vercel.app/api/dashboard-data` - Get dashboard data

### 5. Troubleshooting

#### DEPLOYMENT_NOT_FOUND Error
This usually means:
1. The project structure doesn't match Vercel's expectations
2. Missing `vercel.json` configuration
3. Incorrect build settings

#### API Not Working
1. Check environment variables are set correctly
2. Check function logs in Vercel dashboard
3. Ensure BigQuery credentials are valid

#### Build Failures
1. Check `npm run build` works locally
2. Ensure all dependencies are in root `package.json`
3. Check TypeScript errors with `tsc`

### 6. Local Development

For local development, you can still use the Express server:
```bash
# Frontend
npm run dev

# Backend (in another terminal)
cd server
npm run dev
```

### 7. Important Notes

- The `/api` directory contains the Vercel serverless function version of the backend
- The `/server` directory contains the original Express server for local development
- Both use the same logic but are wrapped differently
- Vercel automatically handles scaling and serverless execution
- Maximum function duration is set to 10 seconds

## Next Steps

1. Deploy to Vercel
2. Set environment variables
3. Test API endpoints
4. Monitor function logs for any issues