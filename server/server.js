import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    hasCredentials: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS)
  });
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
    
    // Query v_quotes view
    const quotesQuery = `
      SELECT *
      FROM \`${projectId}.${datasetId}.v_quotes\`
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    // Query v_jobs view
    const jobsQuery = `
      SELECT *
      FROM \`${projectId}.${datasetId}.v_jobs\`
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    // Run both queries
    const [quotesData, jobsData] = await Promise.all([
      runQuery(quotesQuery),
      runQuery(jobsQuery)
    ]);
    
    // Log sample data to see structure
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
    console.error('BigQuery error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from BigQuery',
      details: error.message,
      code: error.code
    });
  }
});

// API endpoint to fetch dashboard data (legacy - using jobber_quotes table)
app.get('/api/dashboard-data-legacy', async (req, res) => {
  try {
    const datasetId = process.env.BIGQUERY_DATASET || 'jobber_data';
    
    // Query to get all quote data
    const quoteDataQuery = `
      SELECT 
        report_type,
        CAST(period AS STRING) as period,
        quotes_sent,
        quotes_converted,
        conversion_rate,
        value_sent,
        value_converted,
        salespersons
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'jobber-data-warehouse-462721'}.${datasetId}.jobber_quotes\`
      ORDER BY period DESC
      LIMIT 1000
    `;

    const quoteData = await runQuery(quoteDataQuery);
    
    // Log the first row to see column names
    if (quoteData.length > 0) {
      console.log('Sample row:', quoteData[0]);
      console.log('Column names:', Object.keys(quoteData[0]));
    }

    // Process the data into the expected format
    const processedData = processQuoteData(quoteData);

    res.json(processedData);
  } catch (error) {
    console.error('BigQuery error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from BigQuery',
      details: error.message,
      code: error.code
    });
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
    const date = new Date(dateStr);
    return date.toDateString() === today.toDateString();
  };

  // Helper function to check if date is this week
  const isThisWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date >= weekStart && date <= now;
  };

  // Helper function to check if date is in last 30 days
  const isLast30Days = (dateStr) => {
    const date = new Date(dateStr);
    return date >= thirtyDaysAgo && date <= now;
  };

  // 1. Quotes Sent Today
  const quotesSentToday = quotesData.filter(q => isToday(q.created_at)).length;

  // 2. Converted Today (assuming status field indicates conversion)
  const convertedToday = quotesData.filter(q => 
    isToday(q.updated_at || q.created_at) && 
    (q.status === 'converted' || q.status === 'approved')
  ).length;

  // 3. Converted This Week
  const convertedThisWeek = quotesData.filter(q => 
    isThisWeek(q.updated_at || q.created_at) && 
    (q.status === 'converted' || q.status === 'approved')
  ).length;

  // 4. Conversion Rate (CVR) This Week
  const quotesThisWeek = quotesData.filter(q => isThisWeek(q.created_at)).length;
  const cvrThisWeek = quotesThisWeek > 0 ? ((convertedThisWeek / quotesThisWeek) * 100).toFixed(1) : 0;

  // 5. Converted Amount (weekly and daily)
  const convertedAmountToday = quotesData
    .filter(q => isToday(q.updated_at || q.created_at) && (q.status === 'converted' || q.status === 'approved'))
    .reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0);

  const convertedAmountThisWeek = quotesData
    .filter(q => isThisWeek(q.updated_at || q.created_at) && (q.status === 'converted' || q.status === 'approved'))
    .reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0);

  // 6. Converted Quotes (count) - already calculated above
  
  // 7. Weekly Historical Conversions
  const weeklyHistorical = calculateWeeklyHistorical(quotesData);

  // 8. 30-Day Speed to Lead (average time from creation to first response)
  const speedToLead = calculateSpeedToLead(quotesData.filter(q => isLast30Days(q.created_at)));

  // 9. 30-Day Recurring Conversion Rate
  const quotesLast30Days = quotesData.filter(q => isLast30Days(q.created_at));
  const convertedLast30Days = quotesLast30Days.filter(q => q.status === 'converted' || q.status === 'approved').length;
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
      const jobDate = new Date(j.scheduled_start_at || j.created_at);
      return jobDate >= nextMonth && jobDate <= nextMonthEnd;
    })
    .reduce((sum, j) => sum + (parseFloat(j.total_amount) || 0), 0);

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
      const date = new Date(q.created_at);
      return date >= weekStart && date < weekEnd;
    });
    
    const converted = weekQuotes.filter(q => q.status === 'converted' || q.status === 'approved').length;
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
  
  const speeds = quotes
    .filter(q => q.first_response_at)
    .map(q => {
      const created = new Date(q.created_at);
      const responded = new Date(q.first_response_at);
      return (responded - created) / (1000 * 60 * 60); // Convert to hours
    });
  
  if (speeds.length === 0) return 0;
  return (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1);
}

function calculateRecurringRevenue(jobsData) {
  // Filter for recurring jobs and project annual revenue
  return jobsData
    .filter(j => j.recurrence_rule || j.is_recurring)
    .reduce((sum, j) => {
      const amount = parseFloat(j.total_amount) || 0;
      // Assuming monthly recurrence for simplicity - adjust based on actual recurrence rules
      return sum + (amount * 12);
    }, 0);
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
    const jobDate = new Date(job.scheduled_start_at || job.created_at);
    const monthKey = jobDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (months.hasOwnProperty(monthKey)) {
      const amount = parseFloat(job.total_amount) || 0;
      const monthIndex = next6Months.findIndex(m => m.month === monthKey);
      if (monthIndex !== -1) {
        next6Months[monthIndex].amount += amount;
      }
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
      const jobDate = new Date(j.scheduled_start_at || j.created_at);
      return jobDate >= weekStart && jobDate <= weekEnd;
    });
    
    const amount = weekJobs.reduce((sum, j) => sum + (parseFloat(j.total_amount) || 0), 0);
    
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
  
  const recentQuotes = quotesData.filter(q => new Date(q.created_at) >= last90Days);
  const avgConversionRate = recentQuotes.length > 0 
    ? recentQuotes.filter(q => q.status === 'converted' || q.status === 'approved').length / recentQuotes.length
    : 0.3; // Default 30% if no data
  
  const avgQuoteValue = recentQuotes
    .filter(q => q.status === 'converted' || q.status === 'approved')
    .reduce((sum, q, _, arr) => sum + (parseFloat(q.total_amount) || 0) / arr.length, 0);
  
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

// Process quote data into dashboard format
function processQuoteData(data) {
  // Extract salesperson data
  const salespersonMap = new Map();
  
  data.filter(row => row.report_type === 'SALESPERSON').forEach(row => {
    salespersonMap.set(row.salespersons, {
      name: row.salespersons,
      quotesSent: row.quotes_sent || 0,
      quotesConverted: row.quotes_converted || 0,
      conversionRate: row.conversion_rate || 0,
      valueSent: row.value_sent || 0,
      valueConverted: row.value_converted || 0
    });
  });

  // Process time series data
  const dailySentData = data.filter(row => row.report_type === 'DAILY SENT');
  const dailyConvertedData = data.filter(row => row.report_type === 'DAILY CONVERSIONS');
  const weeklyData = data.filter(row => row.report_type === 'WEEKLY SUMMARY');

  // Create time series for different periods
  const timeSeries = {
    week: processWeekData(dailySentData, dailyConvertedData),
    month: processMonthData(weeklyData),
    year: processYearData(data),
    all: processAllTimeData(data)
  };

  // Assign colors to salespersons
  const colors = ['rgb(147, 51, 234)', 'rgb(236, 72, 153)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)'];
  const salespersons = Array.from(salespersonMap.values()).map((sp, index) => ({
    ...sp,
    color: colors[index % colors.length]
  }));

  return {
    timeSeries,
    salespersons,
    lastUpdated: new Date()
  };
}

function processWeekData(sentData, convertedData) {
  // Get last 7 days of data
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = {
    labels: [],
    quotesSent: [],
    quotesConverted: [],
    conversionRate: [],
    totalSent: 0,
    totalConverted: 0
  };

  // Process last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const sent = sentData.find(row => row.period && row.period.startsWith(dateStr));
    const converted = convertedData.find(row => row.period && row.period.startsWith(dateStr));
    
    weekData.labels.push(weekDays[date.getDay()]);
    weekData.quotesSent.push(sent?.quotes_sent || 0);
    weekData.quotesConverted.push(converted?.quotes_converted || 0);
    
    const sentCount = sent?.quotes_sent || 0;
    const convertedCount = converted?.quotes_converted || 0;
    weekData.conversionRate.push(sentCount > 0 ? Math.round((convertedCount / sentCount) * 100) : 0);
    
    weekData.totalSent += sentCount;
    weekData.totalConverted += convertedCount;
  }

  const avgConversionRate = weekData.totalSent > 0 
    ? Math.round((weekData.totalConverted / weekData.totalSent) * 100) 
    : 0;

  return {
    ...weekData,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+5.2%', // Calculate actual change
    period: 'This Week'
  };
}

function processMonthData(weeklyData) {
  // Get last 4 weeks of data
  const recentWeeks = weeklyData.slice(0, 4).reverse();
  
  const monthData = {
    labels: recentWeeks.map((_, i) => `Week ${i + 1}`),
    quotesSent: recentWeeks.map(w => w.quotes_sent || 0),
    quotesConverted: recentWeeks.map(w => w.quotes_converted || 0),
    conversionRate: recentWeeks.map(w => w.conversion_rate || 0),
    totalSent: recentWeeks.reduce((sum, w) => sum + (w.quotes_sent || 0), 0),
    totalConverted: recentWeeks.reduce((sum, w) => sum + (w.quotes_converted || 0), 0)
  };

  const avgConversionRate = monthData.totalSent > 0 
    ? Math.round((monthData.totalConverted / monthData.totalSent) * 100) 
    : 0;

  return {
    ...monthData,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+8.3%', // Calculate actual change
    period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
}

function processYearData(data) {
  // Aggregate data by month for current year
  const currentYear = new Date().getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const launchMonth = LAUNCH_DATE.getMonth(); // March = 2
  
  // Only show months from launch date onwards
  const activeMonths = monthNames.slice(launchMonth);
  
  const yearData = {
    labels: activeMonths,
    quotesSent: new Array(activeMonths.length).fill(0),
    quotesConverted: new Array(activeMonths.length).fill(0),
    conversionRate: new Array(activeMonths.length).fill(0),
    totalSent: 0,
    totalConverted: 0
  };

  // Process data by month
  data.forEach(row => {
    if (row.period && row.report_type !== 'SALESPERSON' && row.period.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const date = new Date(row.period);
        if (date.getFullYear() === currentYear && date >= LAUNCH_DATE) {
          const monthIndex = date.getMonth() - launchMonth;
          if (monthIndex >= 0 && monthIndex < activeMonths.length) {
            if (row.report_type === 'DAILY SENT' && row.quotes_sent) {
              yearData.quotesSent[monthIndex] += row.quotes_sent;
              yearData.totalSent += row.quotes_sent;
            }
            if (row.report_type === 'DAILY CONVERSIONS' && row.quotes_converted) {
              yearData.quotesConverted[monthIndex] += row.quotes_converted;
              yearData.totalConverted += row.quotes_converted;
            }
          }
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });

  // Calculate conversion rates
  yearData.conversionRate = yearData.quotesSent.map((sent, i) => {
    return sent > 0 ? Math.round((yearData.quotesConverted[i] / sent) * 100) : 0;
  });

  const avgConversionRate = yearData.totalSent > 0 
    ? Math.round((yearData.totalConverted / yearData.totalSent) * 100) 
    : 0;

  return {
    ...yearData,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+12.5%', // Calculate actual change
    period: currentYear.toString()
  };
}

function processAllTimeData(data) {
  // Aggregate data by year
  const yearMap = new Map();
  
  data.forEach(row => {
    if (row.period && row.report_type !== 'SALESPERSON' && row.period.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const year = new Date(row.period).getFullYear();
        if (!yearMap.has(year)) {
          yearMap.set(year, { sent: 0, converted: 0 });
        }
        
        const yearData = yearMap.get(year);
        if (row.report_type === 'DAILY SENT' && row.quotes_sent) {
          yearData.sent += row.quotes_sent;
        }
        if (row.report_type === 'DAILY CONVERSIONS' && row.quotes_converted) {
          yearData.converted += row.quotes_converted;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });

  const years = Array.from(yearMap.keys()).sort();
  const allTimeData = {
    labels: years.map(y => y.toString()),
    quotesSent: years.map(y => yearMap.get(y).sent),
    quotesConverted: years.map(y => yearMap.get(y).converted),
    conversionRate: years.map(y => {
      const data = yearMap.get(y);
      return data.sent > 0 ? Math.round((data.converted / data.sent) * 100) : 0;
    }),
    totalSent: 0,
    totalConverted: 0
  };

  allTimeData.totalSent = allTimeData.quotesSent.reduce((sum, val) => sum + val, 0);
  allTimeData.totalConverted = allTimeData.quotesConverted.reduce((sum, val) => sum + val, 0);

  const avgConversionRate = allTimeData.totalSent > 0 
    ? Math.round((allTimeData.totalConverted / allTimeData.totalSent) * 100) 
    : 0;

  return {
    ...allTimeData,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+15.8%', // Calculate actual change
    period: 'All Time'
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});