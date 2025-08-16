import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function testNewSpeedToLead() {
  try {
    const bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }
    
    const bigquery = new BigQuery(bigqueryConfig);
    
    console.log('Testing Speed to Lead with new sent_datetime field...\n');
    
    // Test with the new field
    const newQuery = `
      SELECT 
        AVG(TIMESTAMP_DIFF(
          q.sent_datetime,
          r.requested_on_date, 
          MINUTE
        )) as avg_minutes_to_quote,
        COUNT(*) as total_records,
        MIN(TIMESTAMP_DIFF(q.sent_datetime, r.requested_on_date, MINUTE)) as min_minutes,
        MAX(TIMESTAMP_DIFF(q.sent_datetime, r.requested_on_date, MINUTE)) as max_minutes
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
      JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
        ON r.quote_number = q.quote_number
      WHERE r.requested_on_date IS NOT NULL
        AND q.sent_datetime IS NOT NULL
        AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `;
    
    console.log('Running query with sent_datetime...');
    const [newRows] = await bigquery.query({ query: newQuery, timeoutMs: 8000 });
    const result = newRows[0];
    
    console.log('\n✅ Results with sent_datetime TIMESTAMP:');
    console.log(`Average: ${result.avg_minutes_to_quote?.toFixed(0)} minutes (${(result.avg_minutes_to_quote/60).toFixed(1)} hours)`);
    console.log(`Min: ${result.min_minutes} minutes`);
    console.log(`Max: ${result.max_minutes} minutes`);
    console.log(`Total Records: ${result.total_records}`);
    
    // Compare with old calculation for reference
    const oldQuery = `
      SELECT 
        AVG(TIMESTAMP_DIFF(
          CAST(q.sent_date AS TIMESTAMP),
          r.requested_on_date, 
          MINUTE
        )) as avg_minutes_old
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
      JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
        ON r.quote_number = q.quote_number
      WHERE r.requested_on_date IS NOT NULL
        AND q.sent_date IS NOT NULL
        AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `;
    
    const [oldRows] = await bigquery.query({ query: oldQuery, timeoutMs: 8000 });
    
    console.log('\n❌ Old calculation (for comparison):');
    console.log(`Average: ${oldRows[0].avg_minutes_old?.toFixed(0)} minutes (WRONG - negative values)`);
    
    // Sample some recent records to verify
    const sampleQuery = `
      SELECT 
        r.quote_number,
        q.client_name,
        r.requested_on_date,
        q.sent_date,
        q.sent_datetime,
        TIMESTAMP_DIFF(q.sent_datetime, r.requested_on_date, MINUTE) as minutes_to_quote
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
      JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
        ON r.quote_number = q.quote_number
      WHERE r.requested_on_date IS NOT NULL
        AND q.sent_datetime IS NOT NULL
        AND DATE(r.requested_on_date) = CURRENT_DATE('America/New_York')
      ORDER BY r.requested_on_date DESC
      LIMIT 5
    `;
    
    console.log('\n\nSample quotes from today:');
    const [sampleRows] = await bigquery.query({ query: sampleQuery, timeoutMs: 8000 });
    
    sampleRows.forEach((row, index) => {
      console.log(`\n${index + 1}. Quote #${row.quote_number} - ${row.client_name}`);
      console.log(`   Requested: ${row.requested_on_date}`);
      console.log(`   Sent Date: ${row.sent_date.value || row.sent_date}`);
      console.log(`   Sent DateTime: ${row.sent_datetime}`);
      console.log(`   Time to Quote: ${row.minutes_to_quote} minutes (${(row.minutes_to_quote/60).toFixed(1)} hours)`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testNewSpeedToLead();