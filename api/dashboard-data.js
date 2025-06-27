import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';

// Initialize CORS
const corsHandler = cors({ origin: true });

// Initialize BigQuery
let bigqueryConfig = {
  projectId: process.env.BIGQUERY_PROJECT_ID || 'jobber-data-warehouse-462721'
};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  bigqueryConfig.credentials = credentials;
}

const bigquery = new BigQuery(bigqueryConfig);

export default async function handler(req, res) {
  // Run CORS
  await new Promise((resolve, reject) => {
    corsHandler(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query v_quotes view
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

    // Query v_jobs view
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
    const [quotesResult, jobsResult] = await Promise.all([
      bigquery.query(quotesQuery),
      bigquery.query(jobsQuery)
    ]);

    const quotesData = quotesResult[0];
    const jobsData = jobsResult[0];

    // Process the data into KPIs
    const kpiData = processKPIData(quotesData, jobsData);

    res.status(200).json(kpiData);
  } catch (error) {
    console.error('BigQuery error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from BigQuery',
      details: error.message || 'Unknown error'
    });
  }
}

// Process KPI data function
function processKPIData(quotesData, jobsData) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Helper functions
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return date.toDateString() === today.toDateString();
    } catch (e) {
      return false;
    }
  };

  const isThisWeek = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return date >= weekStart && date <= now;
    } catch (e) {
      return false;
    }
  };

  const isLast30Days = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      return date >= thirtyDaysAgo && date <= now;
    } catch (e) {
      return false;
    }
  };

  // Calculate KPIs
  const quotesSentToday = quotesData.filter(q => q.sent_date && isToday(q.sent_date)).length;
  const convertedToday = quotesData.filter(q => q.converted_date && isToday(q.converted_date)).length;
  const convertedThisWeek = quotesData.filter(q => q.converted_date && isThisWeek(q.converted_date)).length;
  const quotesThisWeek = quotesData.filter(q => q.sent_date && isThisWeek(q.sent_date)).length;
  const cvrThisWeek = quotesThisWeek > 0 ? ((convertedThisWeek / quotesThisWeek) * 100).toFixed(1) : 0;

  const convertedAmountToday = quotesData
    .filter(q => q.converted_date && isToday(q.converted_date))
    .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

  const convertedAmountThisWeek = quotesData
    .filter(q => q.converted_date && isThisWeek(q.converted_date))
    .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

  const quotesLast30Days = quotesData.filter(q => q.sent_date && isLast30Days(q.sent_date));
  const convertedLast30Days = quotesLast30Days.filter(q => q.converted_date !== null).length;
  const cvr30Day = quotesLast30Days.length > 0 ? ((convertedLast30Days / quotesLast30Days.length) * 100).toFixed(1) : 0;
  const avgQPD = (quotesLast30Days.length / 30).toFixed(1);

  // Calculate other metrics...
  const recurringRevenue2026 = jobsData.reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0) * 0.2;
  
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

  return {
    kpis: {
      quotesSentToday,
      convertedToday,
      convertedAmountToday: formatCurrency(convertedAmountToday),
      convertedThisWeek,
      cvrThisWeek: `${cvrThisWeek}%`,
      convertedAmountThisWeek: formatCurrency(convertedAmountThisWeek),
      speedToLead30Day: '2.5 hrs', // Placeholder
      cvr30Day: `${cvr30Day}%`,
      avgQPD30Day: avgQPD,
      recurringRevenue2026: formatCurrency(recurringRevenue2026),
      nextMonthOTB: formatCurrency(nextMonthOTB),
      weeklyHistorical: [], // Simplified for now
      otbByMonth: [],
      otbByWeek: [],
      monthlyProjections: []
    },
    lastUpdated: new Date()
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}