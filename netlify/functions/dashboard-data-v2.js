import { BigQuery } from '@google-cloud/bigquery';
import { validateQuote, validateRequest, validateJob } from './lib/data-validators.js';
import { MetricsCalculator } from './lib/metrics-calculator.js';

// Initialize BigQuery client
let bigquery;
try {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    : null;

  bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID || 'pinks-405020',
    credentials: credentials,
    keyFilename: !credentials ? process.env.GOOGLE_APPLICATION_CREDENTIALS : undefined
  });
} catch (error) {
  console.error('[dashboard-data-v2] Failed to initialize BigQuery:', error);
}

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    console.log('[dashboard-data-v2] Starting data fetch...');
    
    // Check BigQuery availability
    if (!bigquery) {
      console.log('[dashboard-data-v2] BigQuery not available');
      return new Response(JSON.stringify({
        success: false,
        error: 'BigQuery not available',
      }), { 
        status: 503,
        headers 
      });
    }

    // Define queries with error handling
    const queries = {
      quotes: `SELECT * FROM \`pinks-405020.pinks.v_quotes\``,
      requests: `SELECT * FROM \`pinks-405020.pinks.v_requests\``,
      jobs: `SELECT * FROM \`pinks-405020.pinks.v_Jobs\``
    };

    // Execute queries in parallel with individual error handling
    const [quotesResult, requestsResult, jobsResult] = await Promise.allSettled([
      bigquery.query({ query: queries.quotes }),
      bigquery.query({ query: queries.requests }),
      bigquery.query({ query: queries.jobs })
    ]);

    // Extract data with fallbacks
    const quotesData = quotesResult.status === 'fulfilled' ? quotesResult.value[0] : [];
    const requestsData = requestsResult.status === 'fulfilled' ? requestsResult.value[0] : [];
    const jobsData = jobsResult.status === 'fulfilled' ? jobsResult.value[0] : [];

    console.log('[dashboard-data-v2] Data fetched:', {
      quotes: quotesData.length,
      requests: requestsData.length,
      jobs: jobsData.length
    });

    // Process data using the new architecture
    const dashboardData = processDataWithValidation(quotesData, requestsData, jobsData);

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('[dashboard-data-v2] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 503,
      headers
    });
  }
};

function processDataWithValidation(quotesData, requestsData, jobsData) {
  // Get reference date from query params or use current date
  const referenceDate = new Date();
  
  // Initialize calculator
  const calculator = new MetricsCalculator(referenceDate);
  
  // Process and validate quotes
  const validatedQuotes = quotesData.map(validateQuote);
  validatedQuotes.forEach(quote => calculator.processQuote(quote));
  
  // Process and validate requests
  const validatedRequests = requestsData.map(validateRequest);
  validatedRequests.forEach(request => calculator.processRequest(request));
  
  // Process and validate jobs
  const validatedJobs = jobsData.map(validateJob);
  validatedJobs.forEach(job => calculator.processJob(job));
  
  // Calculate final metrics
  const kpiMetrics = calculator.calculateFinalMetrics();
  
  // Process salesperson data
  const salespersonData = processSalespersonData(validatedQuotes, calculator);
  
  // Get recent converted quotes for this week
  const recentConvertedQuotes = getRecentConvertedQuotes(validatedQuotes, calculator);
  
  // Process time series data
  const timeSeries = processTimeSeriesData(validatedQuotes, calculator);
  
  return {
    kpiMetrics: {
      ...kpiMetrics,
      reviewsThisWeek: 3 // Mock value - would need reviews data
    },
    salespersons: salespersonData.allTime,
    salespersonsThisWeek: salespersonData.thisWeek,
    recentConvertedQuotes,
    timeSeries,
    lastUpdated: new Date(),
    dataSource: 'bigquery'
  };
}

function processSalespersonData(quotes, calculator) {
  const salespersonStats = {};
  const salespersonWeekStats = {};
  
  quotes.forEach(quote => {
    const sp = quote.salesperson;
    const sentDate = quote.sent_date;
    const totalDollars = quote.total_dollars;
    const isConverted = quote.status === 'Converted' || quote.status === 'converted';
    
    // Initialize stats
    if (!salespersonStats[sp]) {
      salespersonStats[sp] = {
        name: sp,
        quotesSent: 0,
        quotesConverted: 0,
        valueSent: 0,
        valueConverted: 0
      };
    }
    
    // All-time stats
    if (sentDate) {
      salespersonStats[sp].quotesSent++;
      salespersonStats[sp].valueSent += totalDollars;
      
      if (isConverted) {
        salespersonStats[sp].quotesConverted++;
        salespersonStats[sp].valueConverted += totalDollars;
      }
    }
    
    // This week stats
    if (sentDate && calculator.isThisWeek(sentDate)) {
      if (!salespersonWeekStats[sp]) {
        salespersonWeekStats[sp] = {
          name: sp,
          quotesSent: 0,
          quotesConverted: 0,
          valueSent: 0,
          valueConverted: 0
        };
      }
      
      salespersonWeekStats[sp].quotesSent++;
      salespersonWeekStats[sp].valueSent += totalDollars;
      
      if (isConverted) {
        salespersonWeekStats[sp].quotesConverted++;
        salespersonWeekStats[sp].valueConverted += totalDollars;
      }
    }
  });
  
  // Calculate conversion rates and format
  const colors = ['rgb(147, 51, 234)', 'rgb(236, 72, 153)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)'];
  
  const formatStats = (stats, index) => ({
    ...stats,
    conversionRate: stats.quotesSent > 0 ? (stats.quotesConverted / stats.quotesSent) * 100 : 0,
    color: colors[index % colors.length]
  });
  
  return {
    allTime: Object.values(salespersonStats)
      .map(formatStats)
      .sort((a, b) => b.valueConverted - a.valueConverted)
      .slice(0, 10),
    thisWeek: Object.values(salespersonWeekStats)
      .map(formatStats)
      .filter(sp => sp.quotesSent > 0)
      .sort((a, b) => b.valueConverted - a.valueConverted)
  };
}

function getRecentConvertedQuotes(quotes, calculator) {
  return quotes
    .filter(quote => {
      const isConverted = quote.status === 'Converted' || quote.status === 'converted';
      return quote.converted_date && isConverted && calculator.isThisWeek(quote.converted_date);
    })
    .map(quote => ({
      dateConverted: quote.converted_date.toLocaleDateString(),
      quoteNumber: quote.quote_number,
      jobNumber: quote.job_number,
      date: quote.job_date ? quote.job_date.toLocaleDateString() : '',
      jobType: quote.job_type || 'ONE_OFF',
      clientName: quote.client_name,
      salesPerson: quote.salesperson,
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: quote.client_name,
      totalDollars: quote.total_dollars,
      status: quote.status
    }))
    .sort((a, b) => new Date(b.dateConverted) - new Date(a.dateConverted))
    .slice(0, 20);
}

function processTimeSeriesData(quotes, calculator) {
  // This would be expanded to process weekly, monthly, yearly time series
  // For now, returning a simplified structure
  return {
    week: {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      quotesSent: [0, 0, 0, 0, 0, 0, 0],
      quotesConverted: [0, 0, 0, 0, 0, 0, 0],
      conversionRate: [0, 0, 0, 0, 0, 0, 0],
      totalSent: 0,
      totalConverted: 0,
      avgConversionRate: '0%',
      conversionChange: '0%',
      period: 'This Week'
    }
  };
}

// Removed mock data generator to avoid temporary manual entries

export const config = {
  path: "/api/dashboard-data-v2"
};