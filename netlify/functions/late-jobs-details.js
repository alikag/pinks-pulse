// Netlify Function: late-jobs-details
// Purpose: Fetch additional details for late jobs from Jobber API
// Status: TEMPLATE - Requires Jobber API credentials and implementation

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client with proper credentials
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

// Jobber API configuration (would need to be set up)
const JOBBER_API_KEY = process.env.JOBBER_API_KEY;
const JOBBER_API_URL = 'https://api.getjobber.com/api/';

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('[late-jobs-details] Starting request...');

    // Query late jobs from the v_late_jobs view with proper column names
    const query = `
      SELECT 
        \`Job #\` as job_number,
        \`Name\` as name,
        FORMAT_DATE('%Y-%m-%d', \`Date of visit\`) as date_of_visit,
        FORMAT_DATE('%Y-%m-%d', \`Date of next visit\`) as date_of_next_visit,
        \`Link to job\` as link_to_job,
        \`Value\` as value,
        \`Discount applied\` as discount_applied,
        \`Notes\` as notes,
        -- Calculate days late from date of visit
        DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(\`Date of visit\`), DAY) as days_late
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_late_jobs\`
      ORDER BY \`Date of visit\` DESC, \`Job #\`
      LIMIT 100
    `;

    const bigquery = getBigQueryClient();
    const [rows] = await bigquery.query({ query });
    
    console.log(`[late-jobs-details] Found ${rows.length} late jobs`);
    
    // Get summary statistics from the view
    const summaryQuery = `
      SELECT
        COUNT(*) as total_late_jobs,
        SUM(\`Value\`) as total_value,
        SUM(\`Discount applied\`) as total_discounts
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_late_jobs\`
    `;
    
    const [summaryRows] = await bigquery.query({ query: summaryQuery });
    const summaryStats = summaryRows[0] || {};

    // The view already provides all the formatted data
    const lateJobs = rows.map(job => ({
      job_number: job.job_number?.toString() || '',
      name: job.name || '',
      date_of_visit: job.date_of_visit || '',
      date_of_next_visit: job.date_of_next_visit || null,
      link_to_job: job.link_to_job || '',
      value: job.value || 0,
      discount_applied: job.discount_applied || null,
      notes: job.notes || '',
      days_late: job.days_late || 0,
      job_type: '', // Not available in the view
      salesperson: '', // Not available in the view
      status: job.days_late > 7 ? 'very_late' : 'late'
    }));

    // TODO: Implement Jobber API calls to get additional details
    // This would require:
    // 1. Setting up Jobber API authentication
    // 2. Making API calls for each job to get:
    //    - Next visit date (for recurring jobs)
    //    - Discount information
    //    - Job notes
    //    - Current status
    // 3. Implementing AI summary generation

    // Calculate summary statistics
    const totalValue = lateJobs.reduce((sum, job) => sum + (job.value || 0), 0);
    const avgDaysLate = lateJobs.length > 0 
      ? Math.round(lateJobs.reduce((sum, job) => sum + job.days_late, 0) / lateJobs.length)
      : 0;
    const veryLateCount = lateJobs.filter(job => job.days_late > 7).length;
    
    // Since salesperson is not in the view, we can't group by it
    const bySalesperson = {};

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        late_jobs: lateJobs,
        total_count: lateJobs.length,
        summary: {
          total_value: summaryStats.total_value || totalValue,
          total_discounts: summaryStats.total_discounts || 0,
          average_days_late: avgDaysLate,
          very_late_count: veryLateCount,
          by_salesperson: bySalesperson
        },
        note: 'Data from v_late_jobs view.'
      }),
    };

  } catch (error) {
    console.error('[late-jobs-details] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to fetch late jobs data'
      }),
    };
  }
};

// Generate a basic summary from available data
function generateBasicSummary(job) {
  const parts = [];
  
  parts.push(`Job scheduled for ${job.days_late} days ago.`);
  
  if (job.job_type === 'RECURRING') {
    parts.push('This is a recurring job.');
  }
  
  parts.push(`Assigned to ${job.salesperson}.`);
  parts.push(`Value: $${job.job_value.toLocaleString()}.`);
  
  return parts.join(' ');
}

// TODO: Implement these functions when Jobber API is set up

async function fetchJobberJobDetails(jobNumber) {
  // Would make API call to Jobber to get full job details
  // Including notes, status, discount, etc.
  return null;
}

async function fetchNextVisitDate(jobNumber) {
  // Would make API call to get next scheduled visit for recurring jobs
  return null;
}

async function generateAISummary(notes, jobDetails) {
  // Would call Claude/OpenAI API to generate intelligent summary
  // of job notes and context
  return null;
}