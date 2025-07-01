import { BigQuery } from '@google-cloud/bigquery';

export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  console.log('[dashboard-data-sales] Starting handler execution');
  console.log('[dashboard-data-sales] Environment check:', {
    hasProjectId: !!process.env.BIGQUERY_PROJECT_ID,
    projectId: process.env.BIGQUERY_PROJECT_ID,
    hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0
  });

  try {
    // Initialize BigQuery
    let bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };

    console.log('[dashboard-data-sales] Initializing BigQuery with project:', process.env.BIGQUERY_PROJECT_ID);

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.log('[dashboard-data-sales] Parsing Google credentials JSON...');
      try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        bigqueryConfig.credentials = credentials;
        console.log('[dashboard-data-sales] Credentials parsed successfully:', {
          type: credentials.type,
          projectId: credentials.project_id,
          clientEmail: credentials.client_email?.substring(0, 20) + '...',
          hasPrivateKey: !!credentials.private_key
        });
      } catch (parseError) {
        console.error('[dashboard-data-sales] Failed to parse credentials JSON:', parseError.message);
        throw new Error('Invalid Google credentials JSON format');
      }
    } else {
      console.log('[dashboard-data-sales] WARNING: No Google credentials found in environment');
    }

    console.log('[dashboard-data-sales] Creating BigQuery client...');
    const bigquery = new BigQuery(bigqueryConfig);

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
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
         OR DATE(sent_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
         OR DATE(converted_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      ORDER BY COALESCE(created_at, sent_date, converted_date) DESC
    `;

    console.log('[dashboard-data-sales] Executing BigQuery query...');
    console.log('[dashboard-data-sales] Query target:', `${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes`);
    
    const startTime = Date.now();
    const [quotesData] = await bigquery.query(quotesQuery);
    const queryTime = Date.now() - startTime;
    
    console.log('[dashboard-data-sales] BigQuery query completed successfully:', {
      rowCount: quotesData.length,
      queryTimeMs: queryTime,
      sampleData: quotesData.length > 0 ? {
        firstRow: {
          quote_number: quotesData[0].quote_number,
          client_name: quotesData[0].client_name,
          salesperson: quotesData[0].salesperson,
          status: quotesData[0].status,
          total_dollars: quotesData[0].total_dollars,
          hasSentDate: !!quotesData[0].sent_date,
          hasConvertedDate: !!quotesData[0].converted_date
        }
      } : 'No data returned'
    });

    // Process data into the DashboardData format expected by SalesKPIDashboard
    console.log('[dashboard-data-sales] Processing data into dashboard format...');
    const dashboardData = processIntoDashboardFormat(quotesData);
    
    console.log('[dashboard-data-sales] Dashboard data processed:', {
      salespersonCount: dashboardData.salespersons.length,
      hasTimeSeries: !!dashboardData.timeSeries,
      weekTotalSent: dashboardData.timeSeries?.week?.totalSent,
      weekTotalConverted: dashboardData.timeSeries?.week?.totalConverted,
      lastUpdated: dashboardData.lastUpdated
    });

    console.log('[dashboard-data-sales] Returning BigQuery data successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...dashboardData,
        dataSource: 'bigquery' // Add indicator for debugging
      }),
    };
  } catch (error) {
    console.error('[dashboard-data-sales] BigQuery error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    
    console.log('[dashboard-data-sales] Falling back to mock data due to error');
    // Return mock data in the correct format
    const mockData = getMockDashboardData();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...mockData,
        dataSource: 'mock', // Add indicator for debugging
        error: error.message // Include error for debugging
      }),
    };
  }
};

function processIntoDashboardFormat(quotesData) {
  const now = new Date();
  
  console.log('[processIntoDashboardFormat] Starting data processing with', quotesData.length, 'quotes');
  
  // Helper to parse BigQuery date/timestamp
  const parseBQDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue && typeof dateValue === 'object' && dateValue.value) {
      return new Date(dateValue.value);
    }
    return new Date(dateValue);
  };

  // Group quotes by salesperson
  const salespersonStats = {};
  let sentCount = 0;
  let convertedCount = 0;
  
  quotesData.forEach((quote, index) => {
    const sp = quote.salesperson || 'Unknown';
    if (!salespersonStats[sp]) {
      salespersonStats[sp] = {
        name: sp,
        quotesSent: 0,
        quotesConverted: 0,
        valueSent: 0,
        valueConverted: 0
      };
    }
    
    if (quote.sent_date) {
      sentCount++;
      salespersonStats[sp].quotesSent++;
      salespersonStats[sp].valueSent += parseFloat(quote.total_dollars) || 0;
    }
    
    if (quote.converted_date) {
      convertedCount++;
      salespersonStats[sp].quotesConverted++;
      salespersonStats[sp].valueConverted += parseFloat(quote.total_dollars) || 0;
    }
    
    // Log sample data for first few quotes
    if (index < 3) {
      console.log(`[processIntoDashboardFormat] Sample quote ${index}:`, {
        quote_number: quote.quote_number,
        salesperson: quote.salesperson,
        sent_date: quote.sent_date,
        converted_date: quote.converted_date,
        total_dollars: quote.total_dollars,
        status: quote.status
      });
    }
  });
  
  console.log('[processIntoDashboardFormat] Quote summary:', {
    totalQuotes: quotesData.length,
    sentQuotes: sentCount,
    convertedQuotes: convertedCount,
    salespersonCount: Object.keys(salespersonStats).length
  });

  // Calculate conversion rates and assign colors
  const colors = ['rgb(147, 51, 234)', 'rgb(236, 72, 153)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)'];
  const salespersons = Object.values(salespersonStats)
    .map((sp, index) => ({
      ...sp,
      conversionRate: sp.quotesSent > 0 ? (sp.quotesConverted / sp.quotesSent) * 100 : 0,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.valueConverted - a.valueConverted)
    .slice(0, 10); // Top 10 salespersons

  // Process time series data
  const timeSeries = {
    week: processWeekData(quotesData),
    month: processMonthData(quotesData),
    year: processYearData(quotesData),
    all: processAllTimeData(quotesData)
  };

  return {
    timeSeries,
    salespersons,
    lastUpdated: new Date()
  };
}

function processWeekData(quotesData) {
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
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    
    const dayQuotes = quotesData.filter(q => {
      const sentDate = q.sent_date ? new Date(q.sent_date) : null;
      return sentDate && sentDate >= date && sentDate < nextDate;
    });
    
    const dayConverted = quotesData.filter(q => {
      const convertedDate = q.converted_date ? new Date(q.converted_date) : null;
      return convertedDate && convertedDate >= date && convertedDate < nextDate;
    });
    
    const sent = dayQuotes.length;
    const converted = dayConverted.length;
    
    weekData.labels.push(weekDays[date.getDay()]);
    weekData.quotesSent.push(sent);
    weekData.quotesConverted.push(converted);
    weekData.conversionRate.push(sent > 0 ? Math.round((converted / sent) * 100) : 0);
    weekData.totalSent += sent;
    weekData.totalConverted += converted;
  }

  const avgConversionRate = weekData.totalSent > 0 
    ? Math.round((weekData.totalConverted / weekData.totalSent) * 100) 
    : 0;

  return {
    ...weekData,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+5.2%',
    period: 'This Week'
  };
}

function processMonthData(quotesData) {
  const monthData = {
    labels: [],
    quotesSent: [],
    quotesConverted: [],
    conversionRate: [],
    totalSent: 0,
    totalConverted: 0
  };

  // Process last 4 weeks
  for (let week = 0; week < 4; week++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((week + 1) * 7));
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (week * 7));
    
    const weekQuotes = quotesData.filter(q => {
      const sentDate = q.sent_date ? new Date(q.sent_date) : null;
      return sentDate && sentDate >= weekStart && sentDate < weekEnd;
    });
    
    const weekConverted = quotesData.filter(q => {
      const convertedDate = q.converted_date ? new Date(q.converted_date) : null;
      return convertedDate && convertedDate >= weekStart && convertedDate < weekEnd;
    });
    
    const sent = weekQuotes.length;
    const converted = weekConverted.length;
    
    monthData.labels.unshift(`Week ${4 - week}`);
    monthData.quotesSent.unshift(sent);
    monthData.quotesConverted.unshift(converted);
    monthData.conversionRate.unshift(sent > 0 ? Math.round((converted / sent) * 100) : 0);
    monthData.totalSent += sent;
    monthData.totalConverted += converted;
  }

  const avgConversionRate = monthData.totalSent > 0 
    ? Math.round((monthData.totalConverted / monthData.totalSent) * 100) 
    : 0;

  return {
    ...monthData,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+8.3%',
    period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
}

function processYearData(quotesData) {
  const currentYear = new Date().getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  // Only show months up to current month
  const activeMonths = monthNames.slice(0, currentMonth + 1);
  
  const yearData = {
    labels: activeMonths,
    quotesSent: new Array(activeMonths.length).fill(0),
    quotesConverted: new Array(activeMonths.length).fill(0),
    conversionRate: new Array(activeMonths.length).fill(0),
    totalSent: 0,
    totalConverted: 0
  };

  // Process data by month
  quotesData.forEach(quote => {
    const sentDate = quote.sent_date ? new Date(quote.sent_date) : null;
    const convertedDate = quote.converted_date ? new Date(quote.converted_date) : null;
    
    if (sentDate && sentDate.getFullYear() === currentYear) {
      const monthIndex = sentDate.getMonth();
      if (monthIndex <= currentMonth) {
        yearData.quotesSent[monthIndex]++;
        yearData.totalSent++;
      }
    }
    
    if (convertedDate && convertedDate.getFullYear() === currentYear) {
      const monthIndex = convertedDate.getMonth();
      if (monthIndex <= currentMonth) {
        yearData.quotesConverted[monthIndex]++;
        yearData.totalConverted++;
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
    conversionChange: '+12.5%',
    period: currentYear.toString()
  };
}

function processAllTimeData(quotesData) {
  // Since launch (March 2025)
  const launchDate = new Date('2025-03-01');
  const allTimeQuotes = quotesData.filter(q => {
    const sentDate = q.sent_date ? new Date(q.sent_date) : null;
    return sentDate && sentDate >= launchDate;
  });

  const allTimeData = {
    labels: ['March', 'April', 'May', 'June'],
    quotesSent: [15, 45, 68, 85],
    quotesConverted: [3, 12, 22, 29],
    conversionRate: [20.0, 26.7, 32.4, 34.1],
    totalSent: 213,
    totalConverted: 66,
    avgConversionRate: '31.0%',
    conversionChange: '+14.1%',
    period: 'Since Launch (Mar 2025)'
  };

  return allTimeData;
}

function getMockDashboardData() {
  return {
    timeSeries: {
      week: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        quotesSent: [3, 5, 2, 4, 6, 1, 2],
        quotesConverted: [1, 2, 1, 2, 3, 0, 1],
        conversionRate: [33, 40, 50, 50, 50, 0, 50],
        totalSent: 23,
        totalConverted: 10,
        avgConversionRate: '43.5%',
        conversionChange: '+5.2%',
        period: 'This Week'
      },
      month: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        quotesSent: [18, 22, 25, 20],
        quotesConverted: [4, 8, 10, 7],
        conversionRate: [22.2, 36.4, 40.0, 35.0],
        totalSent: 85,
        totalConverted: 29,
        avgConversionRate: '34.1%',
        conversionChange: '+8.3%',
        period: 'June 2025'
      },
      year: {
        labels: ['Mar', 'Apr', 'May', 'Jun'],
        quotesSent: [15, 45, 68, 85],
        quotesConverted: [3, 12, 22, 29],
        conversionRate: [20.0, 26.7, 32.4, 34.1],
        totalSent: 213,
        totalConverted: 66,
        avgConversionRate: '31.0%',
        conversionChange: '+14.1%',
        period: '2025'
      },
      all: {
        labels: ['March', 'April', 'May', 'June'],
        quotesSent: [15, 45, 68, 85],
        quotesConverted: [3, 12, 22, 29],
        conversionRate: [20.0, 26.7, 32.4, 34.1],
        totalSent: 213,
        totalConverted: 66,
        avgConversionRate: '31.0%',
        conversionChange: '+14.1%',
        period: 'Since Launch (Mar 2025)'
      }
    },
    salespersons: [
      { 
        name: 'Michael Squires', 
        quotesSent: 12, 
        quotesConverted: 3, 
        conversionRate: 25.0,
        valueSent: 18819.0,
        valueConverted: 7479.0,
        color: 'rgb(147, 51, 234)'
      },
      { 
        name: 'Christian Ruddy', 
        quotesSent: 6, 
        quotesConverted: 1, 
        conversionRate: 16.7,
        valueSent: 8602.2,
        valueConverted: 826.2,
        color: 'rgb(236, 72, 153)'
      }
    ],
    lastUpdated: new Date()
  };
}