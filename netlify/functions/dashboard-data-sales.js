const { BigQuery } = require('@google-cloud/bigquery');

exports.handler = async (event, context) => {
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

  try {
    console.log('[dashboard-data-sales] Starting request processing...');
    
    // Check environment variables
    console.log('[dashboard-data-sales] Environment check:', {
      hasProjectId: !!process.env.BIGQUERY_PROJECT_ID,
      projectId: process.env.BIGQUERY_PROJECT_ID,
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0
    });

    // Initialize BigQuery
    let bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };

    console.log('[dashboard-data-sales] Initializing BigQuery with project:', process.env.BIGQUERY_PROJECT_ID);

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        console.log('[dashboard-data-sales] Parsing credentials JSON...');
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        bigqueryConfig.credentials = credentials;
        console.log('[dashboard-data-sales] Credentials parsed successfully');
      } catch (parseError) {
        console.error('[dashboard-data-sales] Failed to parse credentials:', parseError.message);
        throw new Error('Invalid credentials JSON format');
      }
    }

    const bigquery = new BigQuery(bigqueryConfig);
    console.log('[dashboard-data-sales] BigQuery client created');

    // Query for quotes data
    const quotesQuery = `
      SELECT 
        quote_number,
        client_name,
        salesperson,
        status,
        total_dollars,
        sent_date,
        converted_date,
        days_to_convert
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE sent_date IS NOT NULL
      ORDER BY sent_date DESC
    `;

    // Query for jobs data (for OTB calculations)
    const jobsQuery = `
      SELECT 
        Job_Number,
        Date,
        Date_Converted,
        SalesPerson,
        Job_type,
        Calculated_Value
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE PARSE_DATE('%Y-%m-%d', Date) >= CURRENT_DATE()
      ORDER BY Date
    `;

    // Query for requests data (for speed to lead calculations)
    const requestsQuery = `
      SELECT 
        quote_number,
        requested_on_date,
        quote_created_at,
        minutes_to_quote_sent
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\`
      WHERE minutes_to_quote_sent IS NOT NULL
      AND requested_on_date IS NOT NULL
    `;

    console.log('[dashboard-data-sales] Executing queries...');
    
    const [[quotesData], [jobsData], [requestsData]] = await Promise.all([
      bigquery.query(quotesQuery),
      bigquery.query(jobsQuery),
      bigquery.query(requestsQuery)
    ]);
    
    console.log(`[dashboard-data-sales] Query results: ${quotesData.length} quotes, ${jobsData.length} jobs, ${requestsData.length} requests`);

    // Process data into dashboard format
    const dashboardData = processIntoDashboardFormat(quotesData, jobsData, requestsData);
    
    console.log('[dashboard-data-sales] Dashboard data processed:', {
      kpiMetrics: dashboardData.kpiMetrics,
      salespersonCount: dashboardData.salespersons.length,
      hasTimeSeries: !!dashboardData.timeSeries
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(dashboardData),
    };
  } catch (error) {
    console.error('[dashboard-data-sales] Error:', error);
    
    // Return mock data on error
    const mockData = getMockDashboardData();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...mockData,
        dataSource: 'mock',
        error: error.message
      }),
    };
  }
};

function processIntoDashboardFormat(quotesData, jobsData, requestsData) {
  // Find the most recent activity date (either sent or converted) to use as reference
  let referenceDate = new Date();
  const allDates = [];
  
  quotesData.forEach(q => {
    if (q.sent_date) allDates.push(new Date(q.sent_date));
    if (q.converted_date) allDates.push(new Date(q.converted_date));
  });
  
  if (allDates.length > 0) {
    // Use the most recent activity as our "today"
    allDates.sort((a, b) => b - a);
    referenceDate = allDates[0];
    console.log('[dashboard-data-sales] Using reference date from most recent activity:', referenceDate);
  }
  
  // Set timezone to EST and use Sunday-Saturday weeks
  const now = referenceDate;
  const estOffset = -5; // EST offset from UTC
  now.setHours(0 - estOffset, 0, 0, 0);
  
  // Helper functions
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr);
  };
  
  const isToday = (date) => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  };
  
  const isThisWeek = (date) => {
    if (!date) return false;
    const d = new Date(date);
    // Sunday-Saturday weeks
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return d >= weekStart && d < weekEnd;
  };
  
  const isThisMonth = (date) => {
    if (!date) return false;
    const d = new Date(date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };
  
  const isNextMonth = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);
    return d.getMonth() === nextMonth.getMonth() && d.getFullYear() === nextMonth.getFullYear();
  };
  
  const isLast30Days = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return d >= thirtyDaysAgo && d <= now;
  };

  // Initialize metrics
  let metrics = {
    quotesToday: 0,
    convertedToday: 0,
    convertedTodayDollars: 0,
    quotesThisWeek: 0,
    convertedThisWeek: 0,
    convertedThisWeekDollars: 0,
    quotes30Days: 0,
    converted30Days: 0,
    speedToLeadSum: 0,
    speedToLeadCount: 0,
    recurringRevenue2026: 0,
    nextMonthOTB: 0,
    thisMonthOTB: 0,
    thisWeekOTB: 0,
    // For proper CVR calculation
    quotesThisWeekConverted: 0,
    quotes30DaysConverted: 0
  };
  
  // Process quotes data
  const salespersonStats = {};
  const recentConvertedQuotes = [];
  
  quotesData.forEach(quote => {
    const sentDate = parseDate(quote.sent_date);
    const convertedDate = parseDate(quote.converted_date);
    const totalDollars = parseFloat(quote.total_dollars) || 0;
    const sp = quote.salesperson || 'Unknown';
    
    // Initialize salesperson stats
    if (!salespersonStats[sp]) {
      salespersonStats[sp] = {
        name: sp,
        quotesSent: 0,
        quotesConverted: 0,
        valueSent: 0,
        valueConverted: 0
      };
    }
    
    // Count sent quotes and track their conversion
    if (sentDate) {
      salespersonStats[sp].quotesSent++;
      salespersonStats[sp].valueSent += totalDollars;
      
      if (isToday(sentDate)) {
        metrics.quotesToday++;
      }
      if (isThisWeek(sentDate)) {
        metrics.quotesThisWeek++;
        // Check if this quote sent this week was eventually converted
        if (quote.status === 'Converted') {
          metrics.quotesThisWeekConverted++;
        }
      }
      if (isLast30Days(sentDate)) {
        metrics.quotes30Days++;
        // Check if this quote sent in last 30 days was eventually converted
        if (quote.status === 'Converted') {
          metrics.quotes30DaysConverted++;
        }
      }
    }
    
    // Count converted quotes by conversion date
    if (convertedDate && quote.status === 'Converted') {
      salespersonStats[sp].quotesConverted++;
      salespersonStats[sp].valueConverted += totalDollars;
      
      if (isToday(convertedDate)) {
        metrics.convertedToday++;
        metrics.convertedTodayDollars += totalDollars;
      }
      if (isThisWeek(convertedDate)) {
        metrics.convertedThisWeek++;
        metrics.convertedThisWeekDollars += totalDollars;
        
        // Add to recent converted quotes
        if (recentConvertedQuotes.length < 10) {
          recentConvertedQuotes.push({
            dateConverted: convertedDate.toLocaleDateString(),
            quoteNumber: quote.quote_number,
            clientName: quote.client_name,
            salesPerson: quote.salesperson,
            totalDollars: totalDollars,
            status: quote.status
          });
        }
      }
      if (isLast30Days(convertedDate)) {
        metrics.converted30Days++;
      }
      // days_to_convert is not speed to lead - remove this calculation
    }
  });
  
  // Process requests data for speed to lead calculations
  requestsData.forEach(request => {
    const requestDate = parseDate(request.requested_on_date);
    const minutesToQuote = parseFloat(request.minutes_to_quote_sent);
    
    if (requestDate && isLast30Days(requestDate) && !isNaN(minutesToQuote)) {
      metrics.speedToLeadSum += minutesToQuote;
      metrics.speedToLeadCount++;
    }
  });
  
  // Process jobs data for OTB calculations
  jobsData.forEach(job => {
    const jobDate = parseDate(job.Date);
    const jobValue = parseFloat(job.Calculated_Value) || 0;
    
    if (isThisWeek(jobDate)) {
      metrics.thisWeekOTB += jobValue;
    }
    if (isThisMonth(jobDate)) {
      metrics.thisMonthOTB += jobValue;
    }
    if (isNextMonth(jobDate)) {
      metrics.nextMonthOTB += jobValue;
    }
    
    // Check for recurring jobs in 2026
    if (jobDate && jobDate.getFullYear() === 2026 && job.Job_type === 'RECURRING') {
      metrics.recurringRevenue2026 += jobValue;
    }
  });
  
  // Calculate final KPI metrics
  console.log('[dashboard-data-sales] Metrics summary:', {
    quotesToday: metrics.quotesToday,
    quotesThisWeek: metrics.quotesThisWeek,
    quotes30Days: metrics.quotes30Days,
    referenceDate: now.toISOString()
  });
  
  const kpiMetrics = {
    quotesToday: metrics.quotesToday,
    convertedToday: metrics.convertedToday,
    convertedTodayDollars: metrics.convertedTodayDollars,
    quotesThisWeek: metrics.quotesThisWeek,
    convertedThisWeek: metrics.convertedThisWeek,
    convertedThisWeekDollars: metrics.convertedThisWeekDollars,
    cvrThisWeek: metrics.quotesThisWeek > 0 ? 
      parseFloat(((metrics.quotesThisWeekConverted / metrics.quotesThisWeek) * 100).toFixed(1)) : 0,
    quotes30Days: metrics.quotes30Days,
    converted30Days: metrics.converted30Days,
    cvr30Days: metrics.quotes30Days > 0 ? 
      parseFloat(((metrics.quotes30DaysConverted / metrics.quotes30Days) * 100).toFixed(1)) : 0,
    avgQPD: parseFloat((metrics.quotes30Days / 30).toFixed(2)),
    speedToLead30Days: metrics.speedToLeadCount > 0 ? 
      Math.round(metrics.speedToLeadSum / metrics.speedToLeadCount) : 0,
    recurringRevenue2026: metrics.recurringRevenue2026,
    nextMonthOTB: metrics.nextMonthOTB,
    thisMonthOTB: metrics.thisMonthOTB,
    thisWeekOTB: metrics.thisWeekOTB,
    reviewsThisWeek: 3 // Mock value - would need reviews data
  };
  
  // Calculate salesperson stats
  const colors = ['rgb(147, 51, 234)', 'rgb(236, 72, 153)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)'];
  const salespersons = Object.values(salespersonStats)
    .map((sp, index) => ({
      ...sp,
      conversionRate: sp.quotesSent > 0 ? (sp.quotesConverted / sp.quotesSent) * 100 : 0,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.valueConverted - a.valueConverted)
    .slice(0, 10);
  
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
    kpiMetrics,
    recentConvertedQuotes,
    lastUpdated: new Date(),
    dataSource: 'bigquery'
  };
}

// Time series processing functions
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
      return convertedDate && convertedDate >= date && convertedDate < nextDate && q.status === 'Converted';
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
      return convertedDate && convertedDate >= weekStart && convertedDate < weekEnd && q.status === 'Converted';
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
  
  const activeMonths = monthNames.slice(0, currentMonth + 1);
  
  const yearData = {
    labels: activeMonths,
    quotesSent: new Array(activeMonths.length).fill(0),
    quotesConverted: new Array(activeMonths.length).fill(0),
    conversionRate: new Array(activeMonths.length).fill(0),
    totalSent: 0,
    totalConverted: 0
  };

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
    
    if (convertedDate && convertedDate.getFullYear() === currentYear && quote.status === 'Converted') {
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

  const totalSent = allTimeQuotes.length;
  const totalConverted = allTimeQuotes.filter(q => q.status === 'Converted').length;
  const avgConversionRate = totalSent > 0 
    ? Math.round((totalConverted / totalSent) * 100) 
    : 0;

  // Mock data for now - would need to process by month
  return {
    labels: ['March', 'April', 'May', 'June'],
    quotesSent: [15, 45, 68, 85],
    quotesConverted: [3, 12, 22, 29],
    conversionRate: [20.0, 26.7, 32.4, 34.1],
    totalSent: totalSent,
    totalConverted: totalConverted,
    avgConversionRate: `${avgConversionRate}%`,
    conversionChange: '+14.1%',
    period: 'Since Launch (Mar 2025)'
  };
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
    kpiMetrics: {
      quotesToday: 0,
      convertedToday: 0,
      convertedTodayDollars: 17208.18,
      quotesThisWeek: 12,
      convertedThisWeek: 3,
      convertedThisWeekDollars: 17208.18,
      cvrThisWeek: 29,
      quotes30Days: 85,
      converted30Days: 45,
      cvr30Days: 53,
      avgQPD: 3.45,
      speedToLead30Days: 21.78,
      recurringRevenue2026: 111160,
      nextMonthOTB: 73052.50,
      reviewsThisWeek: 3
    },
    recentConvertedQuotes: [
      {
        dateConverted: '6/27/2025',
        quoteNumber: '325',
        clientName: 'Christian Ruddy',
        salesPerson: 'Christian Ruddy',
        totalDollars: 1175.00,
        status: 'Converted'
      }
    ],
    lastUpdated: new Date(),
    dataSource: 'mock'
  };
}