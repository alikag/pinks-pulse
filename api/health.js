import cors from 'cors';

const corsHandler = cors({ origin: true });

export default async function handler(req, res) {
  // Handle CORS
  await new Promise((resolve, reject) => {
    corsHandler(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    projectId: process.env.BIGQUERY_PROJECT_ID || 'jobber-data-warehouse-462721',
    dataset: process.env.BIGQUERY_DATASET || 'jobber_data'
  });
}