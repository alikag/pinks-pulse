// Netlify Function: late-jobs-details
// Purpose: Fetch additional details for late jobs from Jobber API
// Status: TEMPLATE - Requires Jobber API credentials and implementation

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID,
  credentials: {
    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
    private_key: process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

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

    // Query late jobs from BigQuery
    const query = `
      SELECT 
        j.Job_Number as job_number,
        j.Client_Name as client_name,
        j.Date as scheduled_date,
        DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(j.Date), DAY) as days_late,
        j.Job_type as job_type,
        COALESCE(j.One_off_job_dollars, 0) + COALESCE(j.Visit_based_dollars, 0) as job_value,
        j.SalesPerson as salesperson
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` j
      WHERE 
        DATE(j.Date) < CURRENT_DATE('America/New_York')
        AND j.Date_Converted IS NOT NULL
      ORDER BY DATE(j.Date) DESC
      LIMIT 50
    `;

    const [rows] = await bigquery.query({ query });
    
    console.log(`[late-jobs-details] Found ${rows.length} late jobs`);

    // Transform the data to include additional fields
    const lateJobs = rows.map(job => {
      // Format dates
      const scheduledDate = new Date(job.scheduled_date.value);
      const formattedDate = scheduledDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return {
        job_number: job.job_number,
        name: job.client_name,
        date_of_visit: formattedDate,
        date_of_next_visit: null, // Would need Jobber API call
        link_to_job: `https://secure.getjobber.com/jobs/${job.job_number}`,
        value: job.job_value,
        discount_applied: 0, // Would need Jobber API call
        notes: generateBasicSummary(job),
        days_late: job.days_late,
        job_type: job.job_type,
        salesperson: job.salesperson,
        status: 'late' // Would need Jobber API call for actual status
      };
    });

    // TODO: Implement Jobber API calls to get additional details
    // This would require:
    // 1. Setting up Jobber API authentication
    // 2. Making API calls for each job to get:
    //    - Next visit date (for recurring jobs)
    //    - Discount information
    //    - Job notes
    //    - Current status
    // 3. Implementing AI summary generation

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        late_jobs: lateJobs,
        total_count: lateJobs.length,
        note: 'This is a basic implementation. Additional fields require Jobber API integration.'
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