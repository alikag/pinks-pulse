# Deployment Guide for Pink's Pulse Dashboard

## Prerequisites

- GitHub account
- Netlify account
- Google Cloud Project with BigQuery enabled
- Service Account JSON file from Google Cloud

## Step-by-Step Netlify Deployment

### 1. Prepare Your Code

1. Clone the repository:
```bash
git clone https://github.com/alikag/pinks-pulse.git
cd pinks-dashboard/pinks-dashboard
```

2. Ensure `.env` is in `.gitignore` (already configured)

3. Push to your GitHub:
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2. Create Netlify Site

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account and select the repository
4. Build settings (auto-detected from `netlify.toml`):
   - **Base directory**: `pinks-dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `pinks-dashboard/dist`
   - **Functions directory**: `pinks-dashboard/netlify/functions`

### 3. Configure Environment Variables

In Netlify dashboard → Site settings → Environment variables:

```env
# BigQuery Configuration (Required)
BIGQUERY_PROJECT_ID=your-google-cloud-project-id
BIGQUERY_DATASET=jobber_data

# Service Account Credentials (Required)
# Copy entire JSON file contents as a single line
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project",...}

# Dashboard Password (Required)
VITE_DASHBOARD_PASSWORD=your-secure-password-here
```

**Important**: For `GOOGLE_APPLICATION_CREDENTIALS_JSON`:
1. Open your service account JSON file
2. Copy the entire contents
3. Paste as a single line (remove line breaks)
4. Make sure it's valid JSON

### 4. Deploy

1. Click "Deploy site" in Netlify
2. Wait for build to complete (2-3 minutes)
3. Your site will be available at: `https://[your-site-name].netlify.app`

### 5. Test Deployment

1. Visit your Netlify URL
2. Enter the password you set in `VITE_DASHBOARD_PASSWORD`
3. Verify data loads from BigQuery
4. Check all charts and KPIs display correctly

## Custom Domain Setup (Optional)

### Using Netlify Domain Management

1. Go to Domain settings in Netlify dashboard
2. Click "Add a custom domain"
3. Enter your domain (e.g., `dashboard.pinkspulse.com`)
4. Follow DNS configuration:
   - **Option A**: Point your domain's nameservers to Netlify
   - **Option B**: Add CNAME record pointing to your Netlify subdomain

### DNS Configuration

For subdomain (recommended):
```
Type: CNAME
Host: dashboard
Value: [your-site-name].netlify.app
TTL: 300
```

For root domain:
```
Type: A
Host: @
Value: 75.2.60.5 (Netlify's load balancer)
TTL: 300
```

### SSL Certificate

- Netlify automatically provisions Let's Encrypt SSL certificate
- Takes 5-15 minutes after DNS propagation
- Force HTTPS in Domain settings → HTTPS

## BigQuery Setup

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to IAM & Admin → Service Accounts
3. Click "Create Service Account"
4. Name: `pinks-dashboard-reader`
5. Grant roles:
   - BigQuery Data Viewer
   - BigQuery Job User
6. Create key → JSON → Download

### 2. Create Dataset and Views

In BigQuery, create these views in `jobber_data` dataset:

**v_quotes**:
```sql
CREATE OR REPLACE VIEW `jobber_data.v_quotes` AS
SELECT 
  quote_number,
  sent_date,
  converted_date,
  status,
  total_dollars,
  salesperson,
  client_name,
  job_numbers,
  quote_id
FROM your_quotes_table;
```

**v_jobs**:
```sql
CREATE OR REPLACE VIEW `jobber_data.v_jobs` AS
SELECT 
  Job_Number,
  Date,
  Calculated_Value,
  Job_type,
  SalesPerson
FROM your_jobs_table;
```

**v_requests**:
```sql
CREATE OR REPLACE VIEW `jobber_data.v_requests` AS
SELECT 
  quote_number,
  requested_on_date,
  salesperson
FROM your_requests_table;
```

## Netlify Functions

The dashboard uses Netlify Functions for serverless backend:

- **dashboard-data-sales**: Main data endpoint
- **scrape-google-reviews-playwright**: Google Reviews scraper
- **scrape-google-reviews**: Fallback scraper

Functions are automatically deployed with your site. No additional configuration needed.

## Troubleshooting

### Build Failures

**Error**: "Cannot find module"
- Solution: Ensure all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

**Error**: "Build exceeded maximum allowed runtime"
- Solution: Optimize build or upgrade Netlify plan

### Runtime Errors

**502 Error on data load**:
1. Check BigQuery credentials in environment variables
2. Verify service account has correct permissions
3. Check Netlify function logs:
   - Netlify dashboard → Functions → View logs

**No data showing**:
1. Open browser developer console
2. Check for API errors
3. Verify BigQuery views have data
4. Check date/timezone handling

**Google Reviews not loading**:
- Normal behavior - scraper often fails
- Fallback reviews will display
- Check function logs for specific errors

### Environment Variable Issues

**"Invalid credentials"**:
- Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is valid JSON
- Remove all line breaks from JSON
- Verify project ID matches

**"Dataset not found"**:
- Check `BIGQUERY_DATASET` is set to `jobber_data`
- Verify dataset exists in your project

## Performance Optimization

### Netlify Settings

1. Enable asset optimization:
   - Settings → Build & deploy → Post processing
   - Enable "Bundle CSS" and "Minify JS"

2. Set up build hooks for scheduled updates:
   - Settings → Build & deploy → Build hooks
   - Create hook for daily data refresh

### Caching

- Static assets cached for 1 year
- API responses cached for 15 minutes
- Configured in `netlify.toml`

## Security Best Practices

1. **Password Protection**:
   - Use strong password (min 12 characters)
   - Change default password immediately
   - Don't share password in plain text

2. **Service Account**:
   - Use minimal permissions (read-only)
   - Rotate keys periodically
   - Never commit credentials to git

3. **Environment Variables**:
   - Set in Netlify UI only
   - Never hardcode in source
   - Use different values for staging/production

## Monitoring

### Netlify Analytics

- Enable in Netlify dashboard
- Monitor page views and performance
- Track function invocations

### Error Tracking

- Check function logs daily
- Monitor 502/503 errors
- Set up alerts for failures

### BigQuery Monitoring

- Track query costs in Google Cloud Console
- Monitor data freshness
- Set up budget alerts

## Updating the Dashboard

### Code Updates

1. Make changes locally
2. Test thoroughly
3. Commit and push to GitHub
4. Netlify auto-deploys on push

### Data Updates

- BigQuery data updates automatically
- No deployment needed for data changes
- Reviews fallback data in code for manual updates

### Environment Updates

1. Change in Netlify dashboard
2. Trigger redeploy:
   - Deploys → Trigger deploy → Deploy site

## Backup and Recovery

### Code Backup

- All code in GitHub
- Enable branch protection for main
- Regular commits with clear messages

### Data Backup

- BigQuery handles data backups
- Export views periodically
- Document view definitions

### Configuration Backup

- Document all environment variables
- Keep service account JSON secure
- Maintain deployment checklist

## Support

For deployment issues:
1. Check Netlify status page
2. Review function logs
3. Verify BigQuery connectivity
4. Contact: admin@pinkspulse.com

---

**Last Updated**: July 2024
**Dashboard Version**: 2.0.0