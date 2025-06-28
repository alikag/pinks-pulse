# GitHub and Netlify Setup Guide for Pink's Dashboard

This guide will walk you through deploying your BigQuery-connected dashboard to GitHub and Netlify.

## Prerequisites

1. GitHub account
2. Netlify account
3. Google Cloud Project with BigQuery enabled
4. Service account JSON key file with BigQuery permissions

## Step 1: Prepare for GitHub

### 1.1 Create .gitignore
Make sure your `.gitignore` includes sensitive files:

```gitignore
# Environment variables
.env
.env.local
.env.production

# Credentials
credentials/
service-account.json
*.json

# Build outputs
dist/
build/

# Dependencies
node_modules/

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 1.2 Remove Sensitive Data
Ensure no credentials are committed:

```bash
# Check for sensitive files
git ls-files | grep -E "(credentials|\.env|service-account)"

# If any are tracked, remove them
git rm --cached credentials/service-account.json
git rm --cached .env
```

## Step 2: Push to GitHub

### 2.1 Initialize Git Repository

```bash
cd /Users/alikagraham/pinks-dashboard/pinks-dashboard
git init
git add .
git commit -m "Initial commit - Pink's Dashboard"
```

### 2.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `pinks-dashboard`
3. Keep it private initially
4. Don't initialize with README (you already have one)

### 2.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/pinks-dashboard.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Netlify

### 3.1 Connect GitHub to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Authorize Netlify to access your GitHub account
5. Select your `pinks-dashboard` repository

### 3.2 Configure Build Settings

Netlify should automatically detect your settings from `netlify.toml`, but verify:

- **Base directory**: (leave empty)
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3.3 Set Environment Variables

In Netlify dashboard → Site settings → Environment variables, add:

```bash
# BigQuery Configuration
BIGQUERY_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET=jobber_data

# Service Account Credentials (as JSON string)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# Optional: API URL (if not using Netlify Functions)
VITE_API_URL=/.netlify/functions

# Optional: Dashboard Password
VITE_DASHBOARD_PASSWORD=your-secure-password
```

#### Getting Service Account JSON:

1. In Google Cloud Console, go to IAM & Admin → Service Accounts
2. Create or select a service account with BigQuery Data Viewer role
3. Create a new key (JSON format)
4. Copy the entire JSON content
5. In Netlify, paste it as the value for `GOOGLE_APPLICATION_CREDENTIALS_JSON`

### 3.4 Deploy

1. Click "Deploy site"
2. Wait for the build to complete
3. Your site will be available at `https://YOUR-SITE-NAME.netlify.app`

## Step 4: Set Up BigQuery

### 4.1 Verify BigQuery View

Ensure your BigQuery view exists and matches the query structure:

```sql
-- Check if view exists
SELECT table_name 
FROM `your-project-id.jobber_data.INFORMATION_SCHEMA.VIEWS`
WHERE table_name = 'v_quotes';

-- Verify view structure
SELECT column_name, data_type
FROM `your-project-id.jobber_data.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'v_quotes'
ORDER BY ordinal_position;
```

### 4.2 Grant Permissions

Grant your service account the necessary permissions:

```sql
-- Grant viewer access to dataset
GRANT `roles/bigquery.dataViewer` 
ON SCHEMA jobber_data 
TO "serviceAccount:your-service-account@your-project.iam.gserviceaccount.com";
```

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain in Netlify

1. Go to Domain settings in Netlify
2. Add custom domain
3. Follow DNS configuration instructions

### 5.2 Enable HTTPS

Netlify automatically provisions SSL certificates via Let's Encrypt.

## Step 6: Continuous Deployment

### 6.1 Auto Deploy on Push

By default, Netlify will automatically deploy when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update dashboard"
git push origin main
# Netlify automatically builds and deploys
```

### 6.2 Preview Deployments

Pull requests automatically create preview deployments:

1. Create a new branch: `git checkout -b feature/new-chart`
2. Make changes and push
3. Create PR on GitHub
4. Netlify comments with preview URL

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check Node version in `netlify.toml` matches your local version
2. **BigQuery Connection Fails**: Verify environment variables are set correctly
3. **404 on Routes**: Ensure `_redirects` file exists for SPA routing
4. **CORS Errors**: Check function headers include proper CORS settings

### Debug Mode:

1. Enable debug function: Update site to use `dashboard-data-debug` function
2. Check Netlify function logs: Netlify dashboard → Functions → View logs
3. Test locally: `netlify dev` to run functions locally

## Security Best Practices

1. **Never commit credentials** to GitHub
2. **Use environment variables** for all sensitive data
3. **Enable 2FA** on GitHub and Netlify accounts
4. **Restrict BigQuery permissions** to read-only
5. **Set up alerts** for unusual BigQuery usage
6. **Use branch protection** on GitHub main branch

## Maintenance

### Update Dependencies:

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Test locally
npm run dev

# Commit and push
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Monitor Usage:

1. **Netlify**: Check build minutes and bandwidth
2. **BigQuery**: Monitor query costs in Google Cloud Console
3. **Performance**: Use Netlify Analytics or Google Analytics

## Next Steps

1. Set up monitoring and alerts
2. Configure caching for better performance
3. Add authentication if needed
4. Set up staging environment
5. Configure automated testing

## Support

- **Netlify Issues**: Check [Netlify Support](https://docs.netlify.com)
- **BigQuery Issues**: Check [Google Cloud Support](https://cloud.google.com/support)
- **Dashboard Issues**: Check function logs in Netlify dashboard