import { BigQuery } from '@google-cloud/bigquery';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('[debug-dates] Starting debug function...');
    // Initialize BigQuery
    const bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }

    const bigquery = new BigQuery(bigqueryConfig);

    // Query to get this week's quotes
    const query = `
      SELECT 
        COUNT(*) as total_quotes,
        COUNTIF(status = 'Converted') as converted_quotes,
        MIN(sent_date) as earliest_date,
        MAX(sent_date) as latest_date,
        CURRENT_DATE() as bigquery_today,
        DATE_TRUNC(CURRENT_DATE(), WEEK(SUNDAY)) as week_start,
        DATE_ADD(DATE_TRUNC(CURRENT_DATE(), WEEK(SUNDAY)), INTERVAL 6 DAY) as week_end
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE sent_date >= DATE_TRUNC(CURRENT_DATE(), WEEK(SUNDAY))
        AND sent_date <= DATE_ADD(DATE_TRUNC(CURRENT_DATE(), WEEK(SUNDAY)), INTERVAL 6 DAY)
    `;

    console.log('Executing debug query...');
    const [rows] = await bigquery.query(query);
    const weekStats = rows[0];

    // Also get a sample of recent quotes
    const sampleQuery = `
      SELECT 
        quote_number,
        sent_date,
        status
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE sent_date IS NOT NULL
      ORDER BY sent_date DESC
      LIMIT 10
    `;

    const [sampleRows] = await bigquery.query(sampleQuery);

    // JavaScript date calculations
    const jsToday = new Date();
    const jsWeekStart = new Date(jsToday);
    jsWeekStart.setDate(jsToday.getDate() - jsToday.getDay());
    jsWeekStart.setHours(0, 0, 0, 0);
    const jsWeekEnd = new Date(jsWeekStart);
    jsWeekEnd.setDate(jsWeekStart.getDate() + 6);

    const debugInfo = {
      bigQuery: {
        thisWeekQuotes: weekStats.total_quotes,
        thisWeekConverted: weekStats.converted_quotes,
        dataRange: `${weekStats.earliest_date} to ${weekStats.latest_date}`,
        bigQueryToday: weekStats.bigquery_today,
        bigQueryWeekStart: weekStats.week_start,
        bigQueryWeekEnd: weekStats.week_end
      },
      javascript: {
        today: jsToday.toISOString(),
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][jsToday.getDay()],
        weekStart: jsWeekStart.toISOString(),
        weekEnd: jsWeekEnd.toISOString()
      },
      recentQuotes: sampleRows.map(row => ({
        quote: row.quote_number,
        sent: row.sent_date,
        status: row.status
      }))
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(debugInfo, null, 2),
    };
  } catch (error) {
    console.error('[debug-dates] Error:', error);
    
    // Return JavaScript dates even if BigQuery fails
    const jsToday = new Date();
    const jsWeekStart = new Date(jsToday);
    jsWeekStart.setDate(jsToday.getDate() - jsToday.getDay());
    jsWeekStart.setHours(0, 0, 0, 0);
    const jsWeekEnd = new Date(jsWeekStart);
    jsWeekEnd.setDate(jsWeekStart.getDate() + 6);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: error.message,
        javascript: {
          today: jsToday.toISOString(),
          dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][jsToday.getDay()],
          weekStart: jsWeekStart.toISOString(),
          weekEnd: jsWeekEnd.toISOString()
        }
      }, null, 2),
    };
  }
};