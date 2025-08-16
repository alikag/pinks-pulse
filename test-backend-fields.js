import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function testBackendFields() {
  try {
    const bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }
    
    const bigquery = new BigQuery(bigqueryConfig);
    
    console.log('Checking v_quotes fields for timestamp data...\n');
    
    // Check what fields are available in v_quotes
    const schemaQuery = `
      SELECT 
        column_name, 
        data_type 
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'v_quotes'
        AND column_name LIKE '%sent%' OR column_name LIKE '%time%' OR column_name LIKE '%date%'
      ORDER BY ordinal_position
    `;
    
    try {
      const [schemaRows] = await bigquery.query({ query: schemaQuery, timeoutMs: 8000 });
      console.log('Fields in v_quotes related to dates/times:');
      schemaRows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    } catch (e) {
      console.log('Could not query schema, trying sample data instead...');
    }
    
    // Sample a quote to see all available fields
    const sampleQuery = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE sent_date = CURRENT_DATE('America/New_York')
      LIMIT 1
    `;
    
    const [sampleRows] = await bigquery.query({ query: sampleQuery, timeoutMs: 8000 });
    
    if (sampleRows.length > 0) {
      console.log('\nSample quote fields:');
      const quote = sampleRows[0];
      Object.keys(quote).forEach(key => {
        if (key.toLowerCase().includes('sent') || 
            key.toLowerCase().includes('time') || 
            key.toLowerCase().includes('date')) {
          console.log(`  ${key}: ${quote[key]} (${typeof quote[key]})`);
        }
      });
      
      console.log('\nAll available fields:');
      console.log(Object.keys(quote).join(', '));
    }
    
    // Check if there's a sent_datetime or sent_timestamp field
    const timestampCheckQuery = `
      SELECT 
        quote_number,
        sent_date,
        ${['sent_datetime', 'sent_timestamp', 'sent_time', 'quote_sent_at', 'created_at']
          .map(field => `SAFE_CAST(NULL AS STRING) as ${field}`)
          .join(', ')}
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE sent_date = CURRENT_DATE('America/New_York')
      LIMIT 1
    `;
    
    console.log('\n\nChecking for potential timestamp fields...');
    
    // Try each field individually
    const potentialFields = ['sent_datetime', 'sent_timestamp', 'sent_time', 'quote_sent_at', 'created_at', 'updated_at'];
    
    for (const field of potentialFields) {
      try {
        const checkQuery = `
          SELECT ${field}
          FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
          LIMIT 1
        `;
        const [rows] = await bigquery.query({ query: checkQuery, timeoutMs: 2000 });
        console.log(`✅ Field '${field}' exists! Value: ${rows[0][field]}`);
      } catch (e) {
        // Field doesn't exist
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBackendFields();