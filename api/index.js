import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Business launch date - March 1, 2025
const LAUNCH_DATE = new Date('2025-03-01');

// Initialize BigQuery client
let bigqueryConfig = {
  projectId: process.env.BIGQUERY_PROJECT_ID || 'jobber-data-warehouse-462721'
};

// Handle credentials for Vercel deployment
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  // For Vercel - credentials as JSON string
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  bigqueryConfig.credentials = credentials;
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // For local development - credentials as file path
  bigqueryConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const bigquery = new BigQuery(bigqueryConfig);

app.use(cors());
app.use(express.json());

// Test endpoint to check if server is running
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasCredentials: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    projectId: process.env.BIGQUERY_PROJECT_ID || 'jobber-data-warehouse-462721',
    dataset: process.env.BIGQUERY_DATASET || 'jobber_data'
  });
});

// Test BigQuery connection
app.get('/api/test-bigquery', async (req, res) => {
  try {
    // Simple test query
    const testQuery = `SELECT 1 as test`;
    const [rows] = await bigquery.query(testQuery);
    res.json({ success: true, result: rows });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      details: error.errors
    });
  }
});

// Check if views exist and get schema
app.get('/api/check-views', async (req, res) => {
  try {
    const results = {};
    
    // Check v_quotes
    try {
      const [quotesRows] = await bigquery.query(`
        SELECT * FROM \`jobber-data-warehouse-462721.jobber_data.v_quotes\` LIMIT 1
      `);
      results.v_quotes = { 
        success: true, 
        columns: quotesRows.length > 0 ? Object.keys(quotesRows[0]) : [],
        sample: quotesRows[0] || {}
      };
    } catch (error) {
      results.v_quotes = { success: false, error: error.message };
    }
    
    // Check v_jobs
    try {
      const [jobsRows] = await bigquery.query(`
        SELECT * FROM \`jobber-data-warehouse-462721.jobber_data.v_jobs\` LIMIT 1
      `);
      results.v_jobs = { 
        success: true, 
        columns: jobsRows.length > 0 ? Object.keys(jobsRows[0]) : [],
        sample: jobsRows[0] || {}
      };
    } catch (error) {
      results.v_jobs = { success: false, error: error.message };
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to run BigQuery queries
async function runQuery(query) {
  try {
    const options = {
      query: query,
      location: 'US',
    };
    const [rows] = await bigquery.query(options);
    return rows;
  } catch (error) {
    console.error('BigQuery query error:', error);
    throw error;
  }
}

// API endpoint to fetch dashboard data from v_jobs and v_quotes views
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const datasetId = process.env.BIGQUERY_DATASET || 'jobber_data';
    const projectId = process.env.BIGQUERY_PROJECT_ID || 'jobber-data-warehouse-462721';
    
    // Query v_quotes view with correct columns
    const quotesQuery = `
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
      FROM \`jobber-data-warehouse-462721.jobber_data.v_quotes\`
      WHERE created_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    // Query v_jobs view with correct columns
    const jobsQuery = `
      SELECT 
        Job_Number,
        Client_name,
        Date,
        Calculated_Value,
        Job_Status,
        SalesPerson,
        Date_Converted
      FROM \`jobber-data-warehouse-462721.jobber_data.v_jobs\`
      WHERE Date IS NOT NULL
      ORDER BY Date DESC
      LIMIT 1000
    `;

    // Run both queries
    const [quotesData, jobsData] = await Promise.all([
      runQuery(quotesQuery),
      runQuery(jobsQuery)
    ]);
    
    // Log sample data to see structure
    console.log(`BigQuery Success: Found ${quotesData.length} quotes and ${jobsData.length} jobs`);
    
    if (quotesData.length > 0) {
      console.log('Sample quote:', quotesData[0]);
      console.log('Quote columns:', Object.keys(quotesData[0]));
    }
    
    if (jobsData.length > 0) {
      console.log('Sample job:', jobsData[0]);
      console.log('Job columns:', Object.keys(jobsData[0]));
    }

    // Process the data into KPIs
    const kpiData = processKPIData(quotesData, jobsData);

    res.json(kpiData);
  } catch (error) {
    console.error('BigQuery error - Message:', error.message);
    console.error('BigQuery error - Code:', error.code);
    console.error('BigQuery error - Full:', JSON.stringify(error, null, 2));
    
    // Check for specific error types
    if (error.code === 403) {
      res.status(500).json({ 
        error: 'Permission denied - check service account access to BigQuery',
        details: error.message
      });
    } else if (error.code === 404) {
      res.status(500).json({ 
        error: 'Table/View not found - check if v_quotes and v_jobs exist',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch data from BigQuery',
        details: error.message || 'Unknown error',
        code: error.code || 'NO_CODE'
      });
    }
  }
});

// Process KPI data from v_jobs and v_quotes views
function processKPIData(quotesData, jobsData) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Helper function to check if date is today
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return date.toDateString() === today.toDateString();
    } catch (e) {
      return false;
    }
  };

  // Helper function to check if date is this week
  const isThisWeek = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return date >= weekStart && date <= now;
    } catch (e) {
      return false;
    }
  };

  // Helper function to check if date is in last 30 days
  const isLast30Days = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return date >= thirtyDaysAgo && date <= now;
    } catch (e) {
      return false;
    }
  };

  // 1. Quotes Sent Today
  const quotesSentToday = quotesData.filter(q => q.sent_date && isToday(q.sent_date)).length;

  // 2. Converted Today
  const convertedToday = quotesData.filter(q => 
    q.converted_date && isToday(q.converted_date)
  ).length;

  // 3. Converted This Week
  const convertedThisWeek = quotesData.filter(q => 
    q.converted_date && isThisWeek(q.converted_date)
  ).length;

  // 4. Conversion Rate (CVR) This Week
  const quotesThisWeek = quotesData.filter(q => q.sent_date && isThisWeek(q.sent_date)).length;
  const cvrThisWeek = quotesThisWeek > 0 ? ((convertedThisWeek / quotesThisWeek) * 100).toFixed(1) : 0;

  // 5. Converted Amount (weekly and daily)
  const convertedAmountToday = quotesData
    .filter(q => q.converted_date && isToday(q.converted_date))
    .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

  const convertedAmountThisWeek = quotesData
    .filter(q => q.converted_date && isThisWeek(q.converted_date))
    .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

  // 6. Converted Quotes (count) - already calculated above
  
  // 7. Weekly Historical Conversions
  const weeklyHistorical = calculateWeeklyHistorical(quotesData);

  // 8. 30-Day Speed to Lead (using days_to_convert as proxy)
  const speedToLead = calculateSpeedToLead(quotesData.filter(q => q.sent_date && isLast30Days(q.sent_date)));

  // 9. 30-Day Recurring Conversion Rate
  const quotesLast30Days = quotesData.filter(q => q.sent_date && isLast30Days(q.sent_date));
  const convertedLast30Days = quotesLast30Days.filter(q => q.converted_date !== null).length;
  const cvr30Day = quotesLast30Days.length > 0 ? ((convertedLast30Days / quotesLast30Days.length) * 100).toFixed(1) : 0;

  // 10. 30-Day Average Quotes Per Day
  const avgQPD = (quotesLast30Days.length / 30).toFixed(1);

  // 11. 30-Day Overall Conversion Rate - same as #9
  
  // 13. Recurring Revenue (2026 projection) - from jobs with recurring schedules
  const recurringRevenue2026 = calculateRecurringRevenue(jobsData);

  // 14. On the Books by Month
  const otbByMonth = calculateOTBByMonth(jobsData);

  // 15. On the Books by Week
  const otbByWeek = calculateOTBByWeek(jobsData);

  // 16. Next Month OTB
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const nextMonthOTB = jobsData
    .filter(j => {
      if (!j.Date) return false;
      try {
        const jobDate = new Date(j.Date);
        return !isNaN(jobDate.getTime()) && jobDate >= nextMonth && jobDate <= nextMonthEnd;
      } catch (e) {
        return false;
      }
    })
    .reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0);

  // 17. Monthly Converted Revenue Projections (Jul-Dec)
  const monthlyProjections = calculateMonthlyProjections(quotesData, jobsData);

  return {
    kpis: {
      // Daily metrics
      quotesSentToday,
      convertedToday,
      convertedAmountToday: formatCurrency(convertedAmountToday),
      
      // Weekly metrics
      convertedThisWeek,
      cvrThisWeek: `${cvrThisWeek}%`,
      convertedAmountThisWeek: formatCurrency(convertedAmountThisWeek),
      
      // 30-day metrics
      speedToLead30Day: `${speedToLead} hrs`,
      cvr30Day: `${cvr30Day}%`,
      avgQPD30Day: avgQPD,
      
      // Revenue metrics
      recurringRevenue2026: formatCurrency(recurringRevenue2026),
      nextMonthOTB: formatCurrency(nextMonthOTB),
      
      // Historical data for charts
      weeklyHistorical,
      otbByMonth,
      otbByWeek,
      monthlyProjections
    },
    lastUpdated: new Date()
  };
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function calculateWeeklyHistorical(quotesData) {
  const weeks = [];
  for (let i = 0; i < 12; i++) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const weekQuotes = quotesData.filter(q => {
      if (!q.sent_date) return false;
      try {
        const date = new Date(q.sent_date);
        return date >= weekStart && date < weekEnd;
      } catch (e) {
        return false;
      }
    });
    
    const converted = weekQuotes.filter(q => q.converted_date !== null).length;
    const total = weekQuotes.length;
    
    weeks.unshift({
      weekEnding: weekEnd.toLocaleDateString(),
      sent: total,
      converted: converted,
      cvr: total > 0 ? ((converted / total) * 100).toFixed(1) : 0
    });
  }
  return weeks;
}

function calculateSpeedToLead(quotes) {
  if (quotes.length === 0) return 0;
  
  // Use days_to_convert as a proxy for speed to lead
  const speeds = quotes
    .filter(q => q.days_to_convert !== null && q.days_to_convert !== undefined)
    .map(q => q.days_to_convert);
  
  if (speeds.length === 0) return 24; // Default to 24 hours
  const avgDays = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  return (avgDays * 24).toFixed(1); // Convert days to hours
}

function calculateRecurringRevenue(jobsData) {
  // Since we don't have recurring fields, estimate based on repeat customers
  // This is a placeholder - you'll need to define what makes a job "recurring"
  const totalRevenue = jobsData
    .reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0);
  
  // Estimate 20% of revenue as recurring (adjust based on your business)
  return totalRevenue * 0.2;
}

function calculateOTBByMonth(jobsData) {
  const months = {};
  const next6Months = [];
  
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months[monthKey] = 0;
    next6Months.push({ month: monthKey, amount: 0 });
  }
  
  jobsData.forEach(job => {
    if (!job.Date) return;
    try {
      const jobDate = new Date(job.Date);
      if (isNaN(jobDate.getTime())) return;
      const monthKey = jobDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (months.hasOwnProperty(monthKey)) {
      const amount = parseFloat(job.Calculated_Value) || 0;
      const monthIndex = next6Months.findIndex(m => m.month === monthKey);
      if (monthIndex !== -1) {
        next6Months[monthIndex].amount += amount;
      }
    }
    } catch (e) {
      console.warn('Invalid job date format:', job.Date);
    }
  });
  
  return next6Months;
}

function calculateOTBByWeek(jobsData) {
  const weeks = [];
  
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekJobs = jobsData.filter(j => {
      if (!j.Date) return false;
      try {
        const jobDate = new Date(j.Date);
        return !isNaN(jobDate.getTime()) && jobDate >= weekStart && jobDate <= weekEnd;
      } catch (e) {
        return false;
      }
    });
    
    const amount = weekJobs.reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0);
    
    weeks.push({
      weekStart: weekStart.toLocaleDateString(),
      amount: amount
    });
  }
  
  return weeks;
}

function calculateMonthlyProjections(quotesData, jobsData) {
  // Calculate conversion trends and project for Jul-Dec
  const projections = [];
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Get average conversion rate and value from historical data
  const last90Days = new Date();
  last90Days.setDate(last90Days.getDate() - 90);
  
  const recentQuotes = quotesData.filter(q => {
    if (!q.sent_date) return false;
    try {
      const sentDate = new Date(q.sent_date);
      return !isNaN(sentDate.getTime()) && sentDate >= last90Days;
    } catch (e) {
      console.warn('Invalid sent_date format:', q.sent_date);
      return false;
    }
  });
  const avgConversionRate = recentQuotes.length > 0 
    ? recentQuotes.filter(q => q.status === 'converted' || q.status === 'approved').length / recentQuotes.length
    : 0.3; // Default 30% if no data
  
  const avgQuoteValue = recentQuotes
    .filter(q => q.status === 'converted' || q.status === 'approved')
    .reduce((sum, q, _, arr) => sum + (parseFloat(q.total_dollars) || 0) / arr.length, 0);
  
  // Project based on historical trends
  months.forEach((month, index) => {
    // Simple projection - can be made more sophisticated
    const projectedQuotes = 100 + (index * 10); // Growth assumption
    const projectedRevenue = projectedQuotes * avgConversionRate * avgQuoteValue;
    
    projections.push({
      month: month + ' 2025',
      projected: projectedRevenue,
      confidence: 'medium'
    });
  });
  
  return projections;
}

// Export as default handler for Vercel
export default app;