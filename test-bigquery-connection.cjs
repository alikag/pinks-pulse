#!/usr/bin/env node

const { BigQuery } = require('@google-cloud/bigquery');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('=== BigQuery Connection Test ===\n');

// Step 1: Check environment variables
console.log('1. Checking environment variables...');
console.log('   - BIGQUERY_PROJECT_ID:', process.env.BIGQUERY_PROJECT_ID ? `Found (${process.env.BIGQUERY_PROJECT_ID})` : 'NOT FOUND');
console.log('   - GOOGLE_APPLICATION_CREDENTIALS_JSON:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? `Found (${process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length} chars)` : 'NOT FOUND');

if (!process.env.BIGQUERY_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  console.error('\n❌ Missing required environment variables!');
  console.error('   Please ensure both BIGQUERY_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS_JSON are set in your .env file');
  process.exit(1);
}

// Step 2: Parse and validate credentials
console.log('\n2. Parsing Google credentials...');
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  console.log('   ✓ Credentials parsed successfully');
  console.log('   - Type:', credentials.type);
  console.log('   - Project ID:', credentials.project_id);
  console.log('   - Client Email:', credentials.client_email);
  console.log('   - Private Key:', credentials.private_key ? 'Present' : 'Missing');
} catch (error) {
  console.error('   ❌ Failed to parse credentials JSON:', error.message);
  process.exit(1);
}

// Step 3: Create BigQuery client
console.log('\n3. Creating BigQuery client...');
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID,
  credentials: credentials
});
console.log('   ✓ BigQuery client created');

// Step 4: Test connection with a simple query
console.log('\n4. Testing BigQuery connection...');
async function testConnection() {
  try {
    // First, try to list datasets
    console.log('   - Listing datasets...');
    const [datasets] = await bigquery.getDatasets();
    console.log(`   ✓ Found ${datasets.length} datasets`);
    datasets.forEach(dataset => {
      console.log(`     • ${dataset.id}`);
    });

    // Check if jobber_data dataset exists
    const jobberDataset = datasets.find(ds => ds.id === 'jobber_data');
    if (!jobberDataset) {
      console.error('   ❌ Dataset "jobber_data" not found!');
      return;
    }

    // Try to get tables in jobber_data dataset
    console.log('\n5. Checking jobber_data dataset...');
    const [tables] = await bigquery.dataset('jobber_data').getTables();
    console.log(`   ✓ Found ${tables.length} tables/views in jobber_data:`);
    tables.forEach(table => {
      console.log(`     • ${table.id}`);
    });

    // Check if v_quotes view exists
    const vQuotesTable = tables.find(t => t.id === 'v_quotes');
    if (!vQuotesTable) {
      console.error('   ❌ View "v_quotes" not found in jobber_data dataset!');
      return;
    }

    // Try to query v_quotes
    console.log('\n6. Testing v_quotes query...');
    const query = `
      SELECT 
        quote_number,
        client_name,
        salesperson,
        status,
        total_dollars,
        created_at,
        sent_date,
        converted_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      LIMIT 5
    `;

    console.log('   - Executing query...');
    const startTime = Date.now();
    const [rows] = await bigquery.query(query);
    const queryTime = Date.now() - startTime;

    console.log(`   ✓ Query executed successfully in ${queryTime}ms`);
    console.log(`   ✓ Retrieved ${rows.length} rows`);

    if (rows.length > 0) {
      console.log('\n   Sample data:');
      rows.forEach((row, i) => {
        console.log(`\n   Row ${i + 1}:`);
        console.log(`     - Quote Number: ${row.quote_number}`);
        console.log(`     - Client: ${row.client_name}`);
        console.log(`     - Salesperson: ${row.salesperson}`);
        console.log(`     - Status: ${row.status}`);
        console.log(`     - Total: $${row.total_dollars}`);
        console.log(`     - Sent Date: ${row.sent_date}`);
        console.log(`     - Converted Date: ${row.converted_date}`);
      });
    }

    // Test the full query used in the function
    console.log('\n7. Testing full production query...');
    const fullQuery = `
      SELECT 
        quote_number,
        client_name,
        salesperson,
        status,
        total_dollars,
        created_at,
        updated_at,
        sent_date,
        approved_date,
        converted_date,
        days_to_convert
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
         OR DATE(sent_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
         OR DATE(converted_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      ORDER BY COALESCE(created_at, sent_date, converted_date) DESC
    `;

    const fullStartTime = Date.now();
    const [fullRows] = await bigquery.query(fullQuery);
    const fullQueryTime = Date.now() - fullStartTime;

    console.log(`   ✓ Full query executed successfully in ${fullQueryTime}ms`);
    console.log(`   ✓ Retrieved ${fullRows.length} rows matching criteria`);

    // Analyze the data
    let sentCount = 0;
    let convertedCount = 0;
    const salespersons = new Set();

    fullRows.forEach(row => {
      if (row.sent_date) sentCount++;
      if (row.converted_date) convertedCount++;
      if (row.salesperson) salespersons.add(row.salesperson);
    });

    console.log('\n   Data analysis:');
    console.log(`     - Quotes with sent_date: ${sentCount}`);
    console.log(`     - Quotes with converted_date: ${convertedCount}`);
    console.log(`     - Unique salespersons: ${salespersons.size}`);

    console.log('\n✅ All tests passed! BigQuery connection is working correctly.');

  } catch (error) {
    console.error('\n❌ BigQuery error:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error details:', error.details);
    if (error.errors) {
      console.error('   Errors:', error.errors);
    }
  }
}

testConnection().catch(console.error);