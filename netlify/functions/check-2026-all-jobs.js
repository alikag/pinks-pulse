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

    // CORRECT query for 2026 total revenue
    const query = `
      SELECT
          COUNT(*) as total_jobs,
          SUM(CASE WHEN Job_type = 'ONE_OFF' THEN 1 ELSE 0 END) as one_off_count,
          SUM(CASE WHEN Job_type = 'RECURRING' THEN 1 ELSE 0 END) as recurring_count,
          SUM(COALESCE(One_off_job_dollars, 0)) as one_off_total,
          SUM(COALESCE(Visit_based_dollars, 0)) as recurring_total,
          SUM(COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total_revenue
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE EXTRACT(YEAR FROM DATE(Date)) = 2026
    `;
    
    const [result] = await bigquery.query({ query });
    
    // Get breakdown by job type
    const breakdownQuery = `
      SELECT 
        Job_type,
        COUNT(*) as count,
        SUM(COALESCE(One_off_job_dollars, 0)) as one_off_dollars,
        SUM(COALESCE(Visit_based_dollars, 0)) as visit_based_dollars,
        SUM(COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE EXTRACT(YEAR FROM DATE(Date)) = 2026
      GROUP BY Job_type
      ORDER BY Job_type
    `;
    
    const [breakdown] = await bigquery.query({ query: breakdownQuery });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: result[0],
        breakdown: breakdown,
        expectedValue: 143720,
        actualValue: result[0].total_revenue,
        difference: 143720 - (result[0].total_revenue || 0),
        explanation: "The $143,720 includes BOTH one-off jobs AND recurring visits"
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