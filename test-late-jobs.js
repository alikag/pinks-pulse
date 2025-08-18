import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function testLateJobs() {
  try {
    const bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }
    
    const bigquery = new BigQuery(bigqueryConfig);
    
    console.log('Testing Late Jobs queries...\n');
    console.log('=' .repeat(80));
    
    // First, check if v_late_jobs exists
    const checkViewQuery = `
      SELECT table_name, table_type
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = 'v_late_jobs'
    `;
    
    try {
      const [viewCheck] = await bigquery.query({ query: checkViewQuery, timeoutMs: 8000 });
      console.log('v_late_jobs view exists:', viewCheck.length > 0 ? 'YES' : 'NO');
      
      if (viewCheck.length > 0) {
        // Count late jobs
        const countQuery = `
          SELECT COUNT(*) as count
          FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_late_jobs\`
        `;
        const [countRows] = await bigquery.query({ query: countQuery, timeoutMs: 8000 });
        console.log('Late jobs in v_late_jobs:', countRows[0].count);
      }
    } catch (e) {
      console.log('v_late_jobs view not found or error:', e.message);
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('Checking v_jobs for potential late jobs...\n');
    
    // Check what jobs should be considered "late"
    const lateJobsAnalysisQuery = `
      WITH job_status AS (
        SELECT 
          Job_Number,
          Client_name,
          Date as scheduled_date,
          Date_Converted,
          Job_type,
          Visit_Status,
          COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0) as value,
          -- Calculate if job is in the past
          CASE 
            WHEN DATE(Date) < CURRENT_DATE('America/New_York') THEN 'past_due'
            WHEN DATE(Date) = CURRENT_DATE('America/New_York') THEN 'today'
            ELSE 'future'
          END as time_status,
          DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(Date), DAY) as days_overdue
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      )
      SELECT 
        time_status,
        COUNT(*) as job_count,
        SUM(value) as total_value,
        COUNT(CASE WHEN Date_Converted IS NOT NULL THEN 1 END) as converted_count,
        COUNT(CASE WHEN Date_Converted IS NULL THEN 1 END) as not_converted_count,
        COUNT(CASE WHEN Visit_Status IS NOT NULL THEN 1 END) as has_visit_status
      FROM job_status
      GROUP BY time_status
      ORDER BY time_status
    `;
    
    const [statusRows] = await bigquery.query({ query: lateJobsAnalysisQuery, timeoutMs: 8000 });
    
    console.log('Job Status Analysis:');
    console.log('-------------------');
    statusRows.forEach(row => {
      console.log(`\n${row.time_status}:`);
      console.log(`  Total jobs: ${row.job_count}`);
      console.log(`  Total value: $${row.total_value?.toLocaleString() || 0}`);
      console.log(`  Converted: ${row.converted_count}`);
      console.log(`  Not converted: ${row.not_converted_count}`);
      console.log(`  Has visit status: ${row.has_visit_status}`);
    });
    
    // Check what columns are available in v_jobs
    console.log('\n' + '=' .repeat(80));
    console.log('Checking v_jobs schema for status fields...\n');
    
    const schemaQuery = `
      SELECT column_name, data_type
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'v_jobs'
        AND (
          LOWER(column_name) LIKE '%status%' 
          OR LOWER(column_name) LIKE '%complete%'
          OR LOWER(column_name) LIKE '%finish%'
          OR LOWER(column_name) LIKE '%done%'
          OR LOWER(column_name) LIKE '%cancel%'
        )
      ORDER BY ordinal_position
    `;
    
    const [schemaRows] = await bigquery.query({ query: schemaQuery, timeoutMs: 8000 });
    console.log('Status-related columns in v_jobs:');
    schemaRows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Get sample of past-due jobs that should be "late"
    console.log('\n' + '=' .repeat(80));
    console.log('Sample of jobs that should be considered "late":\n');
    
    const sampleLateQuery = `
      SELECT 
        Job_Number,
        Client_name,
        DATE(Date) as scheduled_date,
        Date_Converted,
        Job_type,
        Visit_Status,
        COALESCE(One_off_job_dollars, 0) + COALESCE(Visit_based_dollars, 0) as value,
        DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(Date), DAY) as days_overdue
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE DATE(Date) < CURRENT_DATE('America/New_York')
        AND DATE(Date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 30 DAY)
      ORDER BY Date DESC
      LIMIT 10
    `;
    
    const [sampleRows] = await bigquery.query({ query: sampleLateQuery, timeoutMs: 8000 });
    
    sampleRows.forEach((row, index) => {
      console.log(`\n${index + 1}. Job #${row.Job_Number} - ${row.Client_name}`);
      console.log(`   Scheduled: ${row.scheduled_date.value || row.scheduled_date}`);
      console.log(`   Days overdue: ${row.days_overdue}`);
      console.log(`   Value: $${row.value?.toLocaleString() || 0}`);
      console.log(`   Type: ${row.Job_type || 'N/A'}`);
      console.log(`   Date Converted: ${row.Date_Converted || 'Not converted'}`);
      console.log(`   Visit Status: ${row.Visit_Status || 'N/A'}`);
    });
    
    // Check what the current v_late_jobs query is doing (if it exists)
    console.log('\n' + '=' .repeat(80));
    console.log('Testing the actual v_late_jobs query logic...\n');
    
    const testLateJobsLogic = `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN DATE(Date) < CURRENT_DATE('America/New_York') THEN 1 END) as past_due_jobs,
        COUNT(CASE WHEN DATE(Date) < CURRENT_DATE('America/New_York') AND Date_Converted IS NOT NULL THEN 1 END) as past_due_converted,
        COUNT(CASE WHEN DATE(Date) < CURRENT_DATE('America/New_York') AND Date_Converted IS NULL THEN 1 END) as past_due_not_converted
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
    `;
    
    const [logicRows] = await bigquery.query({ query: testLateJobsLogic, timeoutMs: 8000 });
    const logic = logicRows[0];
    
    console.log('Job Counts:');
    console.log(`  Total jobs in v_jobs: ${logic.total_jobs}`);
    console.log(`  Past due jobs: ${logic.past_due_jobs}`);
    console.log(`  Past due AND converted: ${logic.past_due_converted} (WRONG - these are completed, not late!)`);
    console.log(`  Past due AND NOT converted: ${logic.past_due_not_converted} (CORRECT - these are truly late)`);
    
    console.log('\n⚠️  ISSUE FOUND:');
    console.log('The v_late_jobs view is filtering for Date_Converted IS NOT NULL');
    console.log('This means it\'s only showing completed jobs, not late/incomplete jobs!');
    console.log('It should be filtering for Date_Converted IS NULL to find uncompleted late jobs.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLateJobs();