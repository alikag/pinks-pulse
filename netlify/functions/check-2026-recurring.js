import { BigQuery } from '@google-cloud/bigquery';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    });

    // Query to check 2026 recurring revenue
    const query = `
      SELECT 
        COUNT(*) as job_count,
        SUM(COALESCE(One_off_job_dollars, 0)) as one_off_total,
        SUM(COALESCE(Visit_based_dollars, 0)) as visit_based_total,
        SUM(COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total_revenue
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE EXTRACT(YEAR FROM DATE(Date)) = 2026
        AND Job_type = 'RECURRING'
    `;
    
    const [result] = await bigquery.query({ query });
    
    // Also get a sample of jobs to see the data
    const sampleQuery = `
      SELECT 
        Job_Number,
        Date,
        Job_type,
        One_off_job_dollars,
        Visit_based_dollars,
        (COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE EXTRACT(YEAR FROM DATE(Date)) = 2026
        AND Job_type = 'RECURRING'
      ORDER BY Visit_based_dollars DESC
      LIMIT 10
    `;
    
    const [sampleJobs] = await bigquery.query({ query: sampleQuery });
    
    // Check if there are more jobs we're missing
    const allJobsQuery = `
      SELECT 
        EXTRACT(YEAR FROM DATE(Date)) as year,
        Job_type,
        COUNT(*) as count,
        SUM(COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE EXTRACT(YEAR FROM DATE(Date)) >= 2026
      GROUP BY year, Job_type
      ORDER BY year, Job_type
    `;
    
    const [yearlyBreakdown] = await bigquery.query({ query: allJobsQuery });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        recurring2026: result[0],
        sampleJobs: sampleJobs,
        yearlyBreakdown: yearlyBreakdown,
        expectedValue: 143720,
        difference: 143720 - (result[0].total_revenue || 0)
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.toString()
      })
    };
  }
};