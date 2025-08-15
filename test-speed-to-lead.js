import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function testSpeedToLead() {
  try {
    const bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }
    
    const bigquery = new BigQuery(bigqueryConfig);
    
    console.log('Testing Speed to Lead calculation...\n');
    
    // First, let's see what the data looks like
    const sampleQuery = `
      SELECT 
        r.quote_number,
        q.client_name,
        r.requested_on_date,
        q.sent_date,
        q.salesperson,
        TIMESTAMP_DIFF(
          CAST(q.sent_date AS TIMESTAMP),
          CAST(r.requested_on_date AS TIMESTAMP), 
          MINUTE
        ) as minutes_diff_wrong,
        TIMESTAMP_DIFF(
          TIMESTAMP_ADD(CAST(q.sent_date AS TIMESTAMP), INTERVAL 12 HOUR),
          CAST(r.requested_on_date AS TIMESTAMP), 
          MINUTE
        ) as minutes_diff_noon_assumption
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
      JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
        ON r.quote_number = q.quote_number
      WHERE r.requested_on_date IS NOT NULL
        AND q.sent_date IS NOT NULL
        AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      ORDER BY r.requested_on_date DESC
      LIMIT 10
    `;
    
    console.log('Sample recent requests and quotes:');
    const [sampleRows] = await bigquery.query({ query: sampleQuery, timeoutMs: 8000 });
    
    sampleRows.forEach((row, index) => {
      console.log(`\n${index + 1}. Quote #${row.quote_number} - ${row.client_name}`);
      console.log(`   Requested: ${row.requested_on_date}`);
      console.log(`   Sent Date: ${row.sent_date.value || row.sent_date}`);
      console.log(`   Salesperson: ${row.salesperson}`);
      console.log(`   Minutes (current calc): ${row.minutes_diff_wrong}`);
      console.log(`   Minutes (noon assumption): ${row.minutes_diff_noon_assumption}`);
      
      if (row.minutes_diff_wrong < 0) {
        console.log(`   ⚠️ NEGATIVE VALUE - Same day quote!`);
      }
    });
    
    // Now let's see the current average
    const avgQuery = `
      SELECT 
        AVG(TIMESTAMP_DIFF(
          CAST(q.sent_date AS TIMESTAMP),
          CAST(r.requested_on_date AS TIMESTAMP), 
          MINUTE
        )) as avg_minutes_current,
        AVG(CASE 
          WHEN DATE(r.requested_on_date) = DATE(q.sent_date) THEN
            -- Same day: assume quote sent 4 hours after request
            240
          ELSE
            TIMESTAMP_DIFF(
              CAST(q.sent_date AS TIMESTAMP),
              CAST(r.requested_on_date AS TIMESTAMP), 
              MINUTE
            )
        END) as avg_minutes_smart,
        COUNT(*) as total_records,
        COUNT(CASE WHEN DATE(r.requested_on_date) = DATE(q.sent_date) THEN 1 END) as same_day_quotes,
        COUNT(CASE WHEN TIMESTAMP_DIFF(CAST(q.sent_date AS TIMESTAMP), CAST(r.requested_on_date AS TIMESTAMP), MINUTE) < 0 THEN 1 END) as negative_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
      JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
        ON r.quote_number = q.quote_number
      WHERE r.requested_on_date IS NOT NULL
        AND q.sent_date IS NOT NULL
        AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `;
    
    console.log('\n\n30-Day Speed to Lead Summary:');
    const [avgRows] = await bigquery.query({ query: avgQuery, timeoutMs: 8000 });
    const summary = avgRows[0];
    
    console.log(`Total Records: ${summary.total_records}`);
    console.log(`Same-Day Quotes: ${summary.same_day_quotes} (${(summary.same_day_quotes/summary.total_records*100).toFixed(1)}%)`);
    console.log(`Negative Values: ${summary.negative_count}`);
    console.log(`\nCurrent Avg (flawed): ${summary.avg_minutes_current?.toFixed(0)} minutes`);
    console.log(`Smart Avg (4hr for same-day): ${summary.avg_minutes_smart?.toFixed(0)} minutes`);
    
    if (summary.avg_minutes_current) {
      const hours = Math.abs(summary.avg_minutes_current) / 60;
      console.log(`Current Avg in hours: ${hours.toFixed(1)} hours`);
    }
    
    if (summary.avg_minutes_smart) {
      const hours = summary.avg_minutes_smart / 60;
      console.log(`Smart Avg in hours: ${hours.toFixed(1)} hours`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSpeedToLead();