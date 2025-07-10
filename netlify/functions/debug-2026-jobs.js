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

    // Check if there are ANY jobs in 2026 we might be missing
    const allJobsQuery = `
      SELECT 
        Job_type,
        COUNT(*) as count,
        MIN(Date) as earliest_date,
        MAX(Date) as latest_date,
        SUM(COALESCE(One_off_job_dollars, 0)) as one_off_sum,
        SUM(COALESCE(Visit_based_dollars, 0)) as visit_based_sum,
        SUM(COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE DATE(Date) >= '2026-01-01' AND DATE(Date) <= '2026-12-31'
      GROUP BY Job_type
    `;
    
    const [allJobs] = await bigquery.query({ query: allJobsQuery });
    
    // Check what's in the raw jobber_jobs table for 2026
    const rawTableQuery = `
      SELECT 
        job_type,
        COUNT(*) as count,
        SUM(CAST(total AS FLOAT64)) as total_from_raw
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.jobber_jobs\`
      WHERE date >= '2026-01-01' AND date <= '2026-12-31'
        AND status != 'CANCELLED'
      GROUP BY job_type
    `;
    
    let rawTableData = [];
    try {
      [rawTableData] = await bigquery.query({ query: rawTableQuery });
    } catch (e) {
      rawTableData = [{ error: e.message }];
    }
    
    // Check yearly totals
    const yearlyQuery = `
      SELECT 
        EXTRACT(YEAR FROM DATE(Date)) as year,
        SUM(COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0)) as total
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE EXTRACT(YEAR FROM DATE(Date)) BETWEEN 2024 AND 2027
      GROUP BY year
      ORDER BY year
    `;
    
    const [yearlyTotals] = await bigquery.query({ query: yearlyQuery });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        v_jobs_2026: allJobs,
        raw_table_2026: rawTableData,
        yearly_totals: yearlyTotals,
        expectedValue: 143720,
        actualInView: allJobs.reduce((sum, row) => sum + (row.total || 0), 0),
        missingAmount: 143720 - allJobs.reduce((sum, row) => sum + (row.total || 0), 0),
        note: "If ONE_OFF jobs are missing from v_jobs, the view definition might need to be updated"
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