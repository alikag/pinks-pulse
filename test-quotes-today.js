import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function testQuotesToday() {
  try {
    const bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }
    
    const bigquery = new BigQuery(bigqueryConfig);
    
    // Get today's date in EST
    const now = new Date();
    const estDateString = now.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    console.log('Today in EST:', estDateString);
    
    // Query for all quotes sent today
    const query = `
      SELECT 
        quote_number,
        client_name,
        salesperson,
        total_dollars,
        sent_date,
        status
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE DATE(sent_date) = CURRENT_DATE('America/New_York')
      ORDER BY quote_number
    `;
    
    console.log('Running query:', query);
    
    const [rows] = await bigquery.query({ query, timeoutMs: 8000 });
    
    console.log(`\nFound ${rows.length} quotes sent today:\n`);
    
    let totalValue = 0;
    const quoteNumbers = new Set();
    rows.forEach((quote, index) => {
      console.log(`${index + 1}. Quote #${quote.quote_number}`);
      console.log(`   Client: ${quote.client_name}`);
      console.log(`   Salesperson: ${quote.salesperson}`);
      console.log(`   Value: $${quote.total_dollars}`);
      console.log(`   Status: ${quote.status}`);
      console.log(`   Sent Date: ${quote.sent_date.value || quote.sent_date}`);
      if (quoteNumbers.has(quote.quote_number)) {
        console.log(`   ⚠️ DUPLICATE QUOTE NUMBER!`);
      }
      quoteNumbers.add(quote.quote_number);
      console.log('');
      totalValue += parseFloat(quote.total_dollars) || 0;
    });
    
    console.log(`\nSummary:`);
    console.log(`Total Quotes: ${rows.length}`);
    console.log(`Total Value: $${totalValue.toLocaleString()}`);
    
    // Also check for converted quotes
    const convertedQuery = `
      SELECT 
        quote_number,
        client_name,
        total_dollars,
        converted_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE DATE(converted_date) = CURRENT_DATE('America/New_York')
      ORDER BY quote_number
    `;
    
    const [convertedRows] = await bigquery.query({ query: convertedQuery, timeoutMs: 8000 });
    
    console.log(`\nConverted Today: ${convertedRows.length} quotes`);
    const convertedValue = convertedRows.reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);
    console.log(`Converted Value: $${convertedValue.toLocaleString()}`);
    
    if (convertedRows.length > 0) {
      console.log('\nConverted quotes:');
      convertedRows.forEach(q => {
        console.log(`- Quote #${q.quote_number}: ${q.client_name} - $${q.total_dollars}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testQuotesToday();