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

    // Query late jobs from the v_late_jobs view
    const query = `
      SELECT 
        job_number,
        name,
        date_of_visit,
        date_of_next_visit,
        link_to_job,
        value,
        discount_applied,
        notes,
        days_late,
        job_type,
        salesperson,
        one_off_value,
        recurring_value,
        quote_number,
        date_converted
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_late_jobs\`
      ORDER BY days_late DESC, value DESC
      LIMIT 100
    `;

    const bigquery = getBigQueryClient();
    const [rows] = await bigquery.query({ query });
    
    console.log(`[late-jobs-details] Found ${rows.length} late jobs`);

    // The view already provides all the formatted data
    const lateJobs = rows.map(job => ({
      job_number: job.job_number,
      name: job.name,
      date_of_visit: job.date_of_visit,
      date_of_next_visit: job.date_of_next_visit,
      link_to_job: job.link_to_job,
      value: job.value,
      discount_applied: job.discount_applied,
      notes: job.notes,
      days_late: job.days_late,
      job_type: job.job_type,
      salesperson: job.salesperson,
      one_off_value: job.one_off_value,
      recurring_value: job.recurring_value,
      quote_number: job.quote_number,
      date_converted: job.date_converted,
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
    
    // Group by salesperson
    const bySalesperson = lateJobs.reduce((acc, job) => {
      if (!acc[job.salesperson]) {
        acc[job.salesperson] = {
          count: 0,
          total_value: 0,
          jobs: []
        };
      }
      acc[job.salesperson].count++;
      acc[job.salesperson].total_value += job.value || 0;
      acc[job.salesperson].jobs.push(job.job_number);
      return acc;
    }, {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        late_jobs: lateJobs,
        total_count: lateJobs.length,
        summary: {
          total_value: totalValue,
          average_days_late: avgDaysLate,
          very_late_count: veryLateCount,
          by_salesperson: bySalesperson
        },
        note: 'Data from v_late_jobs view. Some fields like date_of_next_visit require Jobber API integration.'
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