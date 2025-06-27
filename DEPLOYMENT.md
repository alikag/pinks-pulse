# Deployment Guide for Pinks Dashboard

## Netlify Deployment

### 1. Initial Setup

1. Push your code to a GitHub repository
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub account and select the repository
5. Configure build settings (already set in `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`

### 2. Environment Variables

In Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add the following variables:

```
VITE_API_URL=https://your-backend-api.com/api
VITE_DASHBOARD_PASSWORD=your-secure-password
```

### 3. Password Protection

The dashboard includes client-side password protection:
- Default password: `pinks2025`
- Change it by setting `VITE_DASHBOARD_PASSWORD` environment variable
- Password is stored in browser localStorage after successful login
- Users stay logged in until they clear browser data

### 4. Backend API Deployment

You need to deploy the backend server separately. Options:

#### Option A: Deploy to Vercel (Recommended for serverless)
1. Install Vercel CLI: `npm i -g vercel`
2. In the `/server` directory, run: `vercel`
3. Set environment variables in Vercel dashboard

#### Option B: Deploy to Google Cloud Run
1. Create a Dockerfile in `/server`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```
2. Deploy using Google Cloud CLI

### 5. Update Frontend API URL

After deploying the backend, update the frontend:
1. In Netlify, update `VITE_API_URL` to your backend URL
2. Trigger a redeploy

### 6. Custom Domain (Optional)

1. In Netlify, go to Domain settings
2. Add your custom domain
3. Follow DNS configuration instructions

## Security Notes

1. **Password Storage**: The current implementation uses client-side authentication which is suitable for basic protection but not for sensitive data
2. **API Security**: Ensure your backend API has proper CORS configuration
3. **Environment Variables**: Never commit `.env` files to git
4. **BigQuery Credentials**: Keep service account keys secure and use environment variables

## Sharing with Managers

Once deployed, share:
1. **URL**: Your Netlify URL (e.g., `https://pinks-dashboard.netlify.app`)
2. **Password**: The password you set in `VITE_DASHBOARD_PASSWORD`
3. **Instructions**: "Enter the password to access the dashboard. It will remember you for future visits."

## Troubleshooting

### Build Failures
- Check Node version (requires 18+)
- Verify all dependencies are installed
- Check build logs in Netlify dashboard

### API Connection Issues
- Verify `VITE_API_URL` is correct
- Check CORS settings on backend
- Ensure backend is running and accessible

### Password Not Working
- Clear browser cache and localStorage
- Verify environment variable is set correctly
- Check browser console for errors