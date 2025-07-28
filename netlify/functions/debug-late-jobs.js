// Debug endpoint to check late jobs data
const { BigQuery } = require('@google-cloud/bigquery');

function getBigQueryClient() {
  const config = {
    projectId: process.env.BIGQUERY_PROJECT_ID
  };
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    config.credentials = credentials;
  }
  
  return new BigQuery(config);
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('[debug-late-jobs] Starting debug...');

    // Query to check what jobs exist and their status
    const debugQuery = `
      WITH job_status AS (
        SELECT 
          j.Job_Number,
          j.Client_Name,
          j.Date as scheduled_date,
          j.Date_Converted,
          j.SalesPerson,
          j.Job_type,
          DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(j.Date), DAY) as days_late,
          CASE 
            WHEN DATE(j.Date) >= CURRENT_DATE('America/New_York') THEN 'future'
            WHEN j.Date_Converted IS NULL THEN 'not_converted'
            WHEN DATE(j.Date_Converted) <= DATE(j.Date) THEN 'completed_on_time'
            ELSE 'late_but_completed'
          END as status,
          COALESCE(j.One_off_job_dollars, 0) + COALESCE(j.Visit_based_dollars, 0) as value
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` j
        WHERE DATE(j.Date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 30 DAY)
      )
      SELECT 
        status,
        COUNT(*) as count,
        STRING_AGG(CONCAT(Job_Number, ' (', Client_Name, ', ', days_late, 'd)'), ', ' LIMIT 5) as sample_jobs,
        SUM(value) as total_value,
        AVG(days_late) as avg_days_late
      FROM job_status
      GROUP BY status
      ORDER BY status
    `;

    const bigquery = getBigQueryClient();
    const [statusRows] = await bigquery.query({ query: debugQuery });
    
    // Also get some specific late jobs
    const lateJobsQuery = `
      SELECT 
        j.Job_Number,
        j.Client_Name,
        FORMAT_DATE('%Y-%m-%d', DATE(j.Date)) as scheduled_date,
        FORMAT_DATE('%Y-%m-%d', DATE(j.Date_Converted)) as converted_date,
        DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(j.Date), DAY) as days_late,
        j.Job_type,
        j.SalesPerson,
        COALESCE(j.One_off_job_dollars, 0) + COALESCE(j.Visit_based_dollars, 0) as value
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` j
      WHERE 
        DATE(j.Date) < CURRENT_DATE('America/New_York')
        AND DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(j.Date), DAY) > 0
      ORDER BY DATE(j.Date) DESC
      LIMIT 20
    `;
    
    const [lateJobs] = await bigquery.query({ query: lateJobsQuery });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        current_date: new Date().toISOString(),
        job_status_summary: statusRows,
        potential_late_jobs: lateJobs,
        total_potential_late: lateJobs.length
      }, null, 2),
    };

  } catch (error) {
    console.error('[debug-late-jobs] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
    };
  }
};