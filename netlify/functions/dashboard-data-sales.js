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
    console.log('[dashboard-data-sales] Starting request processing... v2');
    
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
      WHERE Date IS NOT NULL
        AND (
          -- Future jobs for "next month" and "this week" calculations
          PARSE_DATE('%Y-%m-%d', Date) >= CURRENT_DATE()
          -- All jobs in current month for "this month" calculation
          OR (EXTRACT(YEAR FROM PARSE_DATE('%Y-%m-%d', Date)) = EXTRACT(YEAR FROM CURRENT_DATE())
              AND EXTRACT(MONTH FROM PARSE_DATE('%Y-%m-%d', Date)) = EXTRACT(MONTH FROM CURRENT_DATE()))
        )
      ORDER BY Date
    `;

    // Query for speed to lead calculations - join requests and quotes
    const speedToLeadQuery = `
      WITH speed_data AS (
        SELECT 
          r.quote_number,
          r.requested_on_date,
          q.sent_date,
          q.salesperson,
          TIMESTAMP_DIFF(
            CAST(q.sent_date AS TIMESTAMP), 
            CAST(r.requested_on_date AS TIMESTAMP), 
            MINUTE
          ) as minutes_to_quote
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
        INNER JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
          ON r.quote_number = q.quote_number
        WHERE r.requested_on_date IS NOT NULL 
          AND q.sent_date IS NOT NULL
          AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      )
      SELECT 
        quote_number,
        requested_on_date,
        sent_date,
        salesperson,
        minutes_to_quote
      FROM speed_data
      WHERE minutes_to_quote >= 0
      AND minutes_to_quote < 10080  -- Exclude anything over 7 days as likely data issues
    `;

    console.log('[dashboard-data-sales] Executing queries...');
    
    const [[quotesData], [jobsData], [speedToLeadData]] = await Promise.all([
      bigquery.query(quotesQuery),
      bigquery.query(jobsQuery),
      bigquery.query(speedToLeadQuery)
    ]);
    
    console.log(`[dashboard-data-sales] Query results: ${quotesData.length} quotes, ${jobsData.length} jobs, ${speedToLeadData.length} speed to lead records`);
    
    // Debug: Check sample job dates
    if (jobsData.length > 0) {
      console.log('[dashboard-data-sales] Sample job dates from BigQuery:', {
        totalJobs: jobsData.length,
        first5Jobs: jobsData.slice(0, 5).map(j => ({
          date: j.Date,
          value: j.Calculated_Value,
          type: j.Job_type
        }))
      });
    }
    
    // Debug: Check sample dates from BigQuery
    if (quotesData.length > 0) {
      console.log('[dashboard-data-sales] Sample quote dates from BigQuery:', {
        firstQuote: quotesData[0],
        lastQuote: quotesData[quotesData.length - 1],
        recentDates: quotesData.slice(-5).map(q => ({ sent: q.sent_date, converted: q.converted_date }))
      });
    }

    // Process data into dashboard format
    let dashboardData;
    try {
      dashboardData = processIntoDashboardFormat(quotesData, jobsData, speedToLeadData);
    } catch (processError) {
      console.error('[dashboard-data-sales] Error processing data:', processError);
      throw processError;
    }
    
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

function processIntoDashboardFormat(quotesData, jobsData, speedToLeadData) {
  // Find the most recent activity date (either sent or converted) to use as reference
  let referenceDate = new Date();
  const allDates = [];
  
  quotesData.forEach(q => {
    try {
      if (q.sent_date) {
        const sentDate = parseDate(q.sent_date);
        if (sentDate && !isNaN(sentDate.getTime())) {
          allDates.push(sentDate);
        }
      }
      if (q.converted_date) {
        const convertedDate = parseDate(q.converted_date);
        if (convertedDate && !isNaN(convertedDate.getTime())) {
          allDates.push(convertedDate);
        }
      }
    } catch (e) {
      console.log('[dashboard-data-sales] Error parsing date:', e.message, 'Quote:', q.quote_number);
    }
  });
  
  if (allDates.length > 0) {
    // Use the most recent activity as our "today"
    allDates.sort((a, b) => b - a);
    referenceDate = allDates[0];
    console.log('[dashboard-data-sales] Using reference date from most recent activity:', referenceDate);
  }
  
  // Use the reference date and normalize to start of day
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);
  
  // For week calculations, always use the actual current date in EST
  const actualToday = new Date();
  // Convert to EST timezone string and parse back
  const estString = actualToday.toLocaleString("en-US", {timeZone: "America/New_York"});
  const estToday = new Date(estString);
  estToday.setHours(0, 0, 0, 0);
  
  // Helper functions
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    try {
      // Handle BigQuery date objects that come as { value: "2025-06-27" }
      if (typeof dateStr === 'object' && dateStr.value) {
        // Parse as EST/EDT timezone
        const date = new Date(dateStr.value + 'T00:00:00-05:00');
        return date;
      }
      
      // Handle UTC timestamp strings like "2025-06-27 17:05:33.000000 UTC"
      if (typeof dateStr === 'string' && dateStr.includes('UTC')) {
        // Remove the microseconds and UTC suffix
        const cleanedDate = dateStr.replace(/\.\d{6} UTC$/, '').replace(' ', 'T') + 'Z';
        return new Date(cleanedDate);
      }
      
      // For string dates without time, assume EST/EDT
      if (typeof dateStr === 'string' && !dateStr.includes('T')) {
        return new Date(dateStr + 'T00:00:00-05:00');
      }
      
      return new Date(dateStr);
    } catch (e) {
      console.error('[parseDate] Error parsing date:', dateStr, e);
      return null;
    }
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
    // Sunday-Saturday weeks using EST date
    const weekStart = new Date(estToday);
    weekStart.setDate(estToday.getDate() - estToday.getDay()); // Sunday
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
    quotes30DaysConverted: 0,
    // Weekly OTB breakdown for current month
    weeklyOTBBreakdown: {}
  };
  
  // Process quotes data
  const salespersonStats = {};
  const salespersonWeekStats = {}; // Track this week's performance separately
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
        valueConverted: 0,
        speedToLeadSum: 0,
        speedToLeadCount: 0
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
        
        // Track this week's performance by salesperson
        if (!salespersonWeekStats[sp]) {
          salespersonWeekStats[sp] = {
            name: sp,
            quotesSent: 0,
            quotesConverted: 0,
            valueSent: 0,
            valueConverted: 0,
            conversionRate: 0,
            speedToLeadSum: 0,
            speedToLeadCount: 0
          };
        }
        salespersonWeekStats[sp].quotesSent++;
        salespersonWeekStats[sp].valueSent += totalDollars;
        
        // Check if this quote sent this week was eventually converted
        if (quote.status === 'Converted') {
          metrics.quotesThisWeekConverted++;
          salespersonWeekStats[sp].quotesConverted++;
          salespersonWeekStats[sp].valueConverted += totalDollars;
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
        recentConvertedQuotes.push({
          dateConverted: convertedDate.toLocaleDateString(),
          quoteNumber: quote.quote_number || quote.Quote_Number,
          jobNumber: quote.job_number || quote.Job_Number,
          date: quote.job_date ? parseDate(quote.job_date).toLocaleDateString() : '',
          jobType: quote.job_type || quote.Job_Type || 'ONE_OFF',
          clientName: quote.client_name || quote.Client_Name,
          salesPerson: quote.salesperson || quote.Salesperson,
          jobberLink: quote.jobber_link || quote.Jobber_Link || 'https://secure.getjobber.com',
          visitTitle: quote.visit_title || quote.Visit_Title || quote.client_name || quote.Client_Name,
          totalDollars: totalDollars,
          status: quote.status || quote.Status
        });
      }
      if (isLast30Days(convertedDate)) {
        metrics.converted30Days++;
      }
      // days_to_convert is not speed to lead - remove this calculation
    }
  });
  
  // Process speed to lead data
  let speedToLeadDebug = {
    totalRecords: speedToLeadData.length,
    validRecords: 0,
    sumMinutes: 0
  };
  
  // Initialize speed distribution buckets - Business Hours Focus
  const speedDistribution = {
    '0-60': 0,      // 0-1 hour (Excellent)
    '60-240': 0,    // 1-4 hours (Good - same business day)
    '240-480': 0,   // 4-8 hours (Fair - within business hours)
    '480-1440': 0,  // 8-24 hours (Needs Improvement - next business day)
    '1440-2880': 0, // 1-2 days (Poor)
    '2880+': 0      // 2+ days (Critical)
  };
  
  speedToLeadData.forEach(record => {
    const minutesToQuote = record.minutes_to_quote;
    const salesperson = record.salesperson || 'Unknown';
    const requestDate = parseDate(record.requested_on_date);
    
    if (minutesToQuote !== null && minutesToQuote !== undefined && minutesToQuote >= 0) {
      speedToLeadDebug.validRecords++;
      metrics.speedToLeadSum += minutesToQuote;
      metrics.speedToLeadCount++;
      
      // Add to distribution buckets
      if (minutesToQuote < 60) {
        speedDistribution['0-60']++;
      } else if (minutesToQuote < 240) {
        speedDistribution['60-240']++;
      } else if (minutesToQuote < 480) {
        speedDistribution['240-480']++;
      } else if (minutesToQuote < 1440) {
        speedDistribution['480-1440']++;
      } else if (minutesToQuote < 2880) {
        speedDistribution['1440-2880']++;
      } else {
        speedDistribution['2880+']++;
      }
      
      // Add to salesperson stats
      if (salespersonStats[salesperson]) {
        salespersonStats[salesperson].speedToLeadSum += minutesToQuote;
        salespersonStats[salesperson].speedToLeadCount++;
      }
      
      // Add to weekly stats if this request was this week
      if (requestDate && isThisWeek(requestDate) && salespersonWeekStats[salesperson]) {
        salespersonWeekStats[salesperson].speedToLeadSum += minutesToQuote;
        salespersonWeekStats[salesperson].speedToLeadCount++;
      }
    }
  });
  
  console.log('[Speed to Lead Debug]:', speedToLeadDebug);
  console.log('[Speed to Lead Metrics]:', {
    sum: metrics.speedToLeadSum,
    count: metrics.speedToLeadCount,
    average: metrics.speedToLeadCount > 0 ? Math.round(metrics.speedToLeadSum / metrics.speedToLeadCount) : 0
  });
  
  // Log some sample speed to lead data
  const sampleSpeedData = speedToLeadData.slice(0, 5).map(r => ({
    quote_number: r.quote_number,
    requested_on: r.requested_on_date,
    sent_date: r.sent_date,
    minutes: r.minutes_to_quote
  }));
  console.log('[Sample Speed to Lead Data]:', sampleSpeedData);
  
  // Process jobs data for OTB calculations
  jobsData.forEach(job => {
    const jobDate = parseDate(job.Date);
    const jobValue = parseFloat(job.Calculated_Value) || 0;
    
    if (isThisWeek(jobDate)) {
      metrics.thisWeekOTB += jobValue;
    }
    if (isThisMonth(jobDate)) {
      metrics.thisMonthOTB += jobValue;
      
      // Calculate which week of the month this job falls into
      // Sunday-Saturday weeks
      const firstOfMonth = new Date(jobDate.getFullYear(), jobDate.getMonth(), 1);
      let weekNumber = 1;
      let weekStartDate = new Date(firstOfMonth);
      
      // Find all week starts (Sundays) in the month
      while (weekStartDate <= jobDate) {
        // Calculate the end of the current week (Saturday)
        let weekEndDate = new Date(weekStartDate);
        while (weekEndDate.getDay() !== 6 && weekEndDate.getMonth() === jobDate.getMonth()) {
          weekEndDate.setDate(weekEndDate.getDate() + 1);
        }
        
        // Check if the job date falls within this week
        if (jobDate >= weekStartDate && jobDate <= weekEndDate) {
          break;
        }
        
        // Move to next Sunday
        weekStartDate = new Date(weekEndDate);
        weekStartDate.setDate(weekStartDate.getDate() + 1);
        
        // Only increment week number if we're still in the same month
        if (weekStartDate.getMonth() === jobDate.getMonth()) {
          weekNumber++;
        }
      }
      
      const weekKey = `week${weekNumber}`;
      
      console.log('[OTB Week Debug]', {
        jobDate: jobDate.toLocaleDateString(),
        month: jobDate.toLocaleString('default', { month: 'long' }),
        year: jobDate.getFullYear(),
        weekNumber,
        jobValue,
        jobNumber: job.Job_Number
      });
      
      if (!metrics.weeklyOTBBreakdown[weekKey]) {
        metrics.weeklyOTBBreakdown[weekKey] = 0;
      }
      metrics.weeklyOTBBreakdown[weekKey] += jobValue;
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
    weeklyOTBBreakdown: metrics.weeklyOTBBreakdown,
    reviewsThisWeek: 0 // Real reviews count not available from BigQuery yet
  };
  
  // Log weekly OTB breakdown with more detail
  console.log('[Weekly OTB Breakdown]:', metrics.weeklyOTBBreakdown);
  console.log('[This Month OTB Total]:', metrics.thisMonthOTB);
  console.log('[Current Month]:', estToday.toLocaleString('default', { month: 'long', year: 'numeric' }));
  
  // Log week ranges for debugging
  const debugMonth = estToday.getMonth();
  const debugYear = estToday.getFullYear();
  const firstDay = new Date(debugYear, debugMonth, 1);
  const lastDay = new Date(debugYear, debugMonth + 1, 0);
  console.log('[Week Ranges for', estToday.toLocaleString('default', { month: 'long', year: 'numeric' }), ']:');
  
  let debugDate = new Date(firstDay);
  let debugWeekNum = 1;
  while (debugDate <= lastDay) {
    const weekStart = debugDate.getDate();
    let endDate = new Date(debugDate);
    while (endDate.getDay() !== 6 && endDate.getDate() < lastDay.getDate()) {
      endDate.setDate(endDate.getDate() + 1);
    }
    console.log(`  Week ${debugWeekNum}: ${estToday.toLocaleString('default', { month: 'short' })} ${weekStart}-${Math.min(endDate.getDate(), lastDay.getDate())} = $${metrics.weeklyOTBBreakdown[`week${debugWeekNum}`] || 0}`);
    debugDate = new Date(endDate);
    debugDate.setDate(debugDate.getDate() + 1);
    debugWeekNum++;
  }
  
  // Log job counts by week
  const jobCountsByWeek = {};
  jobsData.forEach(job => {
    const jobDate = parseDate(job.Date);
    if (isThisMonth(jobDate)) {
      const dayOfMonth = jobDate.getDate();
      const weekNumber = Math.ceil(dayOfMonth / 7);
      const weekKey = `week${weekNumber}`;
      jobCountsByWeek[weekKey] = (jobCountsByWeek[weekKey] || 0) + 1;
    }
  });
  console.log('[Jobs Count by Week]:', jobCountsByWeek);
  
  // Debug logging
  console.log('Dashboard Data Debug:', {
    estToday: estToday.toISOString(),
    weekStart: (() => {
      const ws = new Date(estToday);
      ws.setDate(estToday.getDate() - estToday.getDay());
      return ws.toISOString();
    })(),
    metrics: {
      quotesThisWeek: metrics.quotesThisWeek,
      convertedThisWeek: metrics.convertedThisWeek,
      convertedThisWeekDollars: metrics.convertedThisWeekDollars,
      cvrThisWeek: kpiMetrics.cvrThisWeek,
      quotesThisWeekConverted: metrics.quotesThisWeekConverted,
      weeklyOTBBreakdown: metrics.weeklyOTBBreakdown,
      thisMonthOTB: metrics.thisMonthOTB
    },
    recentConvertedQuotesCount: recentConvertedQuotes.length
  });
  
  // Calculate salesperson stats
  const colors = ['rgb(147, 51, 234)', 'rgb(236, 72, 153)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)'];
  const salespersons = Object.values(salespersonStats)
    .map((sp, index) => ({
      ...sp,
      conversionRate: sp.quotesSent > 0 ? (sp.quotesConverted / sp.quotesSent) * 100 : 0,
      avgSpeedToLead: sp.speedToLeadCount > 0 ? Math.round(sp.speedToLeadSum / sp.speedToLeadCount) : null,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.valueConverted - a.valueConverted)
    .slice(0, 10);
    
  // Calculate this week's salesperson stats
  console.log('[Salesperson Week Stats Before Mapping]:', salespersonWeekStats);
  
  const salespersonsThisWeek = Object.values(salespersonWeekStats)
    .map((sp, index) => ({
      ...sp,
      conversionRate: sp.quotesSent > 0 ? (sp.quotesConverted / sp.quotesSent) * 100 : 0,
      avgSpeedToLead: sp.speedToLeadCount > 0 ? Math.round(sp.speedToLeadSum / sp.speedToLeadCount) : null,
      color: colors[index % colors.length]
    }))
    .filter(sp => sp.quotesSent > 0) // Only show salespeople who sent quotes this week
    .sort((a, b) => b.valueConverted - a.valueConverted);
    
  console.log('[Salespersons This Week]:', salespersonsThisWeek.length, 'salespeople with activity');
  
  // Count quotes for this week
  const weekStart = new Date(actualToday);
  weekStart.setDate(actualToday.getDate() - actualToday.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  console.log('[dashboard-data-sales] Week calculation:', {
    actualToday: actualToday.toISOString(),
    dayOfWeek: actualToday.getDay(),
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][actualToday.getDay()],
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString()
  });
  
  const thisWeekQuotes = quotesData.filter(q => {
    const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
    return sentDate && isThisWeek(sentDate);
  });
  
  console.log('[dashboard-data-sales] This week quotes:', {
    count: thisWeekQuotes.length,
    sampleDates: thisWeekQuotes.slice(0, 3).map(q => q.sent_date)
  });
  
  // Process time series data
  const timeSeries = {
    week: processWeekData(quotesData, now, parseDate),
    month: processMonthData(quotesData, now, parseDate),
    year: processYearData(quotesData, now, parseDate),
    all: processAllTimeData(quotesData, now, parseDate)
  };
  
  console.log('[dashboard-data-sales] Week time series data:', {
    labels: timeSeries.week.labels,
    quotesSent: timeSeries.week.quotesSent,
    quotesConverted: timeSeries.week.quotesConverted,
    referenceDate: now.toISOString()
  });
  
  return {
    timeSeries,
    salespersons,
    salespersonsThisWeek, // Add this week's stats
    kpiMetrics,
    recentConvertedQuotes,
    speedDistribution, // Add speed distribution data
    lastUpdated: new Date(),
    dataSource: 'bigquery'
  };
}

// Time series processing functions
function processWeekData(quotesData, referenceDate, parseDate) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = {
    labels: [],
    quotesSent: [],
    quotesConverted: [],
    conversionRate: [],
    totalSent: 0,
    totalConverted: 0
  };

  // Always use actual today for the week view to show the current week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('[processWeekData] Using today for week view:', today.toISOString(), 'Day:', weekDays[today.getDay()]);
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    
    const dayQuotes = quotesData.filter(q => {
      const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
      return sentDate && sentDate >= date && sentDate < nextDate;
    });
    
    // For the chart, show quotes that were sent on this day and eventually converted
    const dayQuotesConverted = dayQuotes.filter(q => q.status === 'Converted').length;
    
    const sent = dayQuotes.length;
    const converted = dayQuotesConverted;
    
    // Debug logging
    console.log(`[processWeekData] Position ${6-i} (i=${i}): ${weekDays[date.getDay()]} (${date.toISOString().split('T')[0]}): ${sent} sent, ${converted} converted`);
    
    // Format label with day and date (e.g., "Mon 12/25")
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateLabel = `${weekDays[date.getDay()]} ${month}/${day}`;
    
    weekData.labels.push(dateLabel);
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

function processMonthData(quotesData, referenceDate, parseDate) {
  const monthData = {
    labels: [],
    quotesSent: [],
    quotesConverted: [],
    conversionRate: [],
    totalSent: 0,
    totalConverted: 0
  };

  // Process last 4 weeks from reference date
  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(referenceDate);
    weekStart.setDate(weekStart.getDate() - ((week + 1) * 7));
    const weekEnd = new Date(referenceDate);
    weekEnd.setDate(weekEnd.getDate() - (week * 7));
    
    const weekQuotes = quotesData.filter(q => {
      const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
      return sentDate && sentDate >= weekStart && sentDate < weekEnd;
    });
    
    // Show quotes sent in this week that were eventually converted
    const weekQuotesConverted = weekQuotes.filter(q => q.status === 'Converted').length;
    
    const sent = weekQuotes.length;
    const converted = weekQuotesConverted;
    
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

function processYearData(quotesData, referenceDate, parseDate) {
  const currentYear = referenceDate.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = referenceDate.getMonth();
  
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
    const sentDate = quote.sent_date ? parseDate(quote.sent_date) : null;
    const convertedDate = quote.converted_date ? parseDate(quote.converted_date) : null;
    
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

function processAllTimeData(quotesData, referenceDate, parseDate) {
  // Since launch (March 2025)
  const launchDate = new Date('2025-03-01');
  const allTimeQuotes = quotesData.filter(q => {
    const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
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
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        quotesSent: [2, 3, 5, 2, 4, 6, 0],
        quotesConverted: [1, 1, 2, 1, 2, 3, 0],
        conversionRate: [50, 33, 40, 50, 50, 50, 0],
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
      convertedTodayDollars: 0,
      quotesThisWeek: 48,
      convertedThisWeek: 14,
      convertedThisWeekDollars: 25000,
      cvrThisWeek: 29.2,
      quotes30Days: 85,
      converted30Days: 45,
      cvr30Days: 53,
      avgQPD: 3.45,
      speedToLead30Days: 22,
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