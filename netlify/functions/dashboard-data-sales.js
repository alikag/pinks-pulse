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

  // Add test endpoint for debugging
  if (event.path && event.path.includes('/test')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        env: {
          hasProjectId: !!process.env.BIGQUERY_PROJECT_ID,
          projectId: process.env.BIGQUERY_PROJECT_ID
        }
      }),
    };
  }
  
  // Add debug endpoint to check quote statuses
  if (event.path && event.path.includes('/debug-quotes')) {
    try {
      const bigqueryConfig = {
        projectId: process.env.BIGQUERY_PROJECT_ID
      };
      
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        bigqueryConfig.credentials = credentials;
      }
      
      const bigquery = new BigQuery(bigqueryConfig);
      
      // Query to check today's quotes specifically
      const debugQuery = `
        SELECT 
          quote_number,
          status,
          sent_date,
          converted_date,
          salesperson,
          total_dollars
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
        WHERE DATE(sent_date) = CURRENT_DATE()
           OR DATE(converted_date) = CURRENT_DATE()
        ORDER BY sent_date DESC, converted_date DESC
        LIMIT 20
      `;
      
      const [rows] = await bigquery.query(debugQuery);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Quote status debug',
          statuses: rows,
          totalRows: rows.length
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Debug query failed',
          message: error.message
        }),
      };
    }
  }

  try {
    console.log('[dashboard-data-sales] Starting request processing... v3');
    
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

    // ============================================
    // QUERY 1: FETCH ALL QUOTES DATA
    // ============================================
    // Purpose: Get all quotes to calculate conversion rates, daily metrics, and salesperson performance
    // This is the foundation for most KPI calculations
    const quotesQuery = `
      SELECT 
        quote_number,        -- Unique identifier for the quote
        quote_id,            -- Jobber's internal ID (base64 encoded)
        client_name,         -- Customer name for display
        salesperson,         -- Who sent the quote (for performance tracking)
        status,              -- Current status: 'Converted', 'Won', 'Awaiting Response', etc.
        total_dollars,       -- Quote value in dollars (what we'd earn if it converts)
        sent_date,           -- When quote was sent to customer (for "Quotes Sent Today")
        converted_date,      -- When customer said YES (for "Converted Today" metrics)
        days_to_convert,     -- How long it took to close (not currently used)
        job_numbers          -- Associated job numbers if converted
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      WHERE sent_date IS NOT NULL  -- Only include quotes that were actually sent
      ORDER BY sent_date DESC      -- Most recent first for display purposes
    `;

    // ============================================
    // QUERY 2: FETCH JOBS DATA FOR "ON THE BOOKS"
    // ============================================
    // Purpose: Get scheduled jobs to calculate future revenue (OTB = On The Books)
    // Shows what revenue is already locked in for future dates
    const jobsQuery = `
      SELECT 
        Job_Number,          -- Unique job identifier
        Date,                -- When the job is scheduled to happen
        Date_Converted,      -- When the quote became a job
        SalesPerson,         -- Who closed the deal
        Job_type,            -- 'RECURRING' or 'ONE_OFF' (important for 2026 recurring metric)
        Calculated_Value     -- Revenue value of the job (excluding sales tax)
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE Date IS NOT NULL     -- Must have a scheduled date
        -- === INCLUDE ALL 2025 AND 2026 JOBS ===
        -- Changed to include ALL jobs from 2025 (for monthly OTB including May/June)
        -- AND 2026 jobs (for recurring revenue calculation)
        -- This ensures we capture all relevant data for the dashboard
        AND EXTRACT(YEAR FROM PARSE_DATE('%Y-%m-%d', Date)) IN (2025, 2026)
      ORDER BY Date  -- Chronological order for processing
    `;

    // ============================================
    // QUERY 3: CALCULATE SPEED TO LEAD METRICS
    // ============================================
    // Purpose: Measure how fast we respond to customer requests
    // Faster response = higher close rate (proven correlation)
    const speedToLeadQuery = `
      WITH speed_data AS (
        SELECT 
          r.quote_number,                    -- Links request to quote
          r.requested_on_date,               -- When customer asked for quote
          q.sent_date,                       -- When we sent the quote
          q.salesperson,                     -- Who handled it
          
          -- Calculate time difference in MINUTES
          -- This is the key metric: how fast did we respond?
          TIMESTAMP_DIFF(
            CAST(q.sent_date AS TIMESTAMP),      -- End time (quote sent)
            CAST(r.requested_on_date AS TIMESTAMP), -- Start time (request received)
            MINUTE                                -- Unit: minutes
          ) as minutes_to_quote
          
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_requests\` r
        
        -- Join requests to quotes on quote_number
        INNER JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
          ON r.quote_number = q.quote_number
          
        WHERE r.requested_on_date IS NOT NULL    -- Must have request date
          AND q.sent_date IS NOT NULL            -- Must have sent date
          -- Only look at last 30 days for current performance
          AND DATE(r.requested_on_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      )
      SELECT 
        quote_number,
        requested_on_date,
        sent_date,
        salesperson,
        minutes_to_quote
      FROM speed_data
      WHERE minutes_to_quote >= 0        -- Exclude negative times (data errors)
        AND minutes_to_quote < 10080     -- Exclude >7 days (10080 min) as likely data issues
      LIMIT 1000  -- Performance limit, we don't need more than this
    `;

    // ============================================
    // QUERY 4: COUNT GOOGLE REVIEWS THIS WEEK
    // ============================================
    // Purpose: Track reputation building through review acquisition
    // NOTE: This is now deprecated - we scrape Google Maps directly instead
    const reviewsQuery = `
      SELECT COUNT(*) as reviews_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.google_reviews\`
      WHERE created_at >= FORMAT_TIMESTAMP('%Y-%m-%d', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY))
    `;

    console.log('[dashboard-data-sales] Executing queries...');
    
    let quotesData, jobsData, speedToLeadData, reviewsData;
    
    try {
      // Execute main queries in parallel for better performance
      [[quotesData], [jobsData], [speedToLeadData]] = await Promise.all([
        bigquery.query(quotesQuery),
        bigquery.query(jobsQuery),
        bigquery.query(speedToLeadQuery)
      ]);
      
      // Try to get reviews count, but don't fail if it doesn't work
      try {
        [reviewsData] = await bigquery.query(reviewsQuery);
      } catch (reviewErr) {
        console.log('[dashboard-data-sales] Reviews query failed (non-critical):', reviewErr.message);
        reviewsData = [{ reviews_count: 0 }];
      }
    } catch (queryError) {
      console.error('[dashboard-data-sales] Critical query error:', queryError);
      throw new Error(`BigQuery query failed: ${queryError.message}`);
    }
    
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
      const reviewsThisWeek = reviewsData[0]?.reviews_count || 0;
      dashboardData = processIntoDashboardFormat(quotesData, jobsData, speedToLeadData, reviewsThisWeek);
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
    console.error('[dashboard-data-sales] Error stack:', error.stack);
    
    // Return detailed error for debugging
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch dashboard data',
        message: error.message,
        details: error.toString(),
        dataSource: 'error'
      }),
    };
  }
};

function processIntoDashboardFormat(quotesData, jobsData, speedToLeadData, reviewsThisWeek = 0) {
  // Helper function to parse dates - defined at the top
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

  // Find the most recent activity date (either sent or converted) to use as reference
  // Use EST timezone for reference date
  const estRefString = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
  let referenceDate = new Date(estRefString);
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
  
  console.log('[Date Calculation Debug]', {
    referenceDate: referenceDate.toLocaleDateString(),
    now: now.toLocaleDateString(),
    actualToday: actualToday.toLocaleDateString(),
    estToday: estToday.toLocaleDateString(),
    estTodayTime: estToday.getTime()
  });
  
  // Helper function to extract Jobber ID from quote_id
  const extractJobberId = (encodedId) => {
    if (!encodedId) return null;
    try {
      // Decode base64
      const decoded = Buffer.from(encodedId, 'base64').toString('utf-8');
      // Extract the numeric ID from the end (e.g., "gid://Jobber/Quote/46164695" -> "46164695")
      const match = decoded.match(/\/(\d+)$/);
      return match ? match[1] : null;
    } catch (e) {
      console.error('[extractJobberId] Error decoding:', encodedId, e);
      return null;
    }
  };

  // Helper functions for date comparisons
  
  const isToday = (date) => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Use actual current EST date, not reference date
    return d.getTime() === estToday.getTime();
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
  
  const isLastWeek = (date) => {
    if (!date) return false;
    const d = new Date(date);
    // Last week's Sunday-Saturday
    const lastWeekStart = new Date(estToday);
    lastWeekStart.setDate(estToday.getDate() - estToday.getDay() - 7); // Last Sunday
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
    return d >= lastWeekStart && d < lastWeekEnd;
  };
  
  const isThisMonth = (date) => {
    if (!date) return false;
    const d = new Date(date);
    // Use actual current date (estToday) for month comparison, not reference date
    return d.getMonth() === estToday.getMonth() && d.getFullYear() === estToday.getFullYear();
  };
  
  const isNextMonth = (date) => {
    if (!date) return false;
    const d = new Date(date);
    // Use actual current date (estToday) for next month calculation
    const nextMonth = new Date(estToday);
    nextMonth.setMonth(estToday.getMonth() + 1);
    return d.getMonth() === nextMonth.getMonth() && d.getFullYear() === nextMonth.getFullYear();
  };
  
  const isLast30Days = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return d >= thirtyDaysAgo && d <= now;
  };
  
  // Get current quarter (1-4)
  const getCurrentQuarter = () => {
    const month = estToday.getMonth(); // 0-11
    return Math.floor(month / 3) + 1;
  };
  
  // Check if date is in current quarter
  const isThisQuarter = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const currentQuarter = getCurrentQuarter();
    const currentYear = estToday.getFullYear();
    
    const quarterStartMonth = (currentQuarter - 1) * 3;
    const quarterStart = new Date(currentYear, quarterStartMonth, 1);
    const quarterEnd = new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59, 999);
    
    return d >= quarterStart && d <= quarterEnd;
  };

  // ================================================
  // INITIALIZE ALL METRICS TO ZERO
  // ================================================
  // This object stores all calculated values that will be displayed on the dashboard
  let metrics = {
    // === TODAY'S METRICS ===
    quotesToday: 0,              // KPI: "Quotes Sent Today" - Count of quotes sent today
    convertedToday: 0,           // Count of quotes that converted today (not displayed)
    convertedTodayDollars: 0,    // KPI: "Converted Today ($)" - Dollar value of today's conversions
    
    // === THIS WEEK METRICS (Sunday-Saturday) ===
    quotesThisWeek: 0,           // Total quotes sent this week (for CVR calculation)
    convertedThisWeek: 0,        // Count of quotes converted this week
    convertedThisWeekDollars: 0, // KPI: "Converted This Week ($)" - Revenue from this week's conversions
    
    // === 30-DAY ROLLING METRICS ===
    quotes30Days: 0,             // Total quotes sent in last 30 days
    converted30Days: 0,          // Count of conversions in last 30 days (not used)
    
    // === SPEED TO LEAD TRACKING ===
    speedToLeadSum: 0,           // Sum of all response times in minutes
    speedToLeadCount: 0,         // Count of quotes with speed data
    // Average = speedToLeadSum / speedToLeadCount
    
    // === FUTURE REVENUE METRICS ===
    recurringRevenue2026: 0,     // KPI: "2026 Recurring" - Recurring jobs scheduled for 2026
    nextMonthOTB: 0,             // KPI: "Next Month OTB" - Jobs scheduled for next month
    thisMonthOTB: 0,             // Jobs scheduled for current month (not displayed)
    thisWeekOTB: 0,              // Jobs scheduled for current week (not displayed)
    
    // === CONVERSION RATE CALCULATIONS ===
    // IMPORTANT: These track quotes BY SEND DATE that eventually converted
    quotesThisWeekConverted: 0,  // Quotes SENT this week that have converted (any time)
    quotes30DaysConverted: 0,    // Quotes SENT in last 30 days that have converted
    
    // === SMART CVR FALLBACK DATA ===
    // When no conversions yet this week, we show last week's rate
    quotesLastWeek: 0,           // Total quotes sent last week
    quotesLastWeekConverted: 0,  // Quotes sent last week that converted
    
    // === CHART DATA STRUCTURES ===
    weeklyOTBBreakdown: {},      // Week-by-week OTB for 5-week chart
    monthlyOTBData: {            // Month-by-month OTB for yearly chart
      1: 0,   // January
      2: 0,   // February
      3: 0,   // March
      4: 0,   // April
      5: 0,   // May
      6: 0,   // June
      7: 0,   // July
      8: 0,   // August
      9: 0,   // September
      10: 0,  // October
      11: 0,  // November
      12: 0   // December
    }
  };
  
  // Process quotes data
  const salespersonStats = {};
  const salespersonWeekStats = {}; // Track this week's performance separately
  const recentConvertedQuotes = [];
  
  // Debug: Check unique statuses in the data
  const uniqueStatuses = [...new Set(quotesData.map(q => q.status))];
  console.log('[Quote Status Debug] Unique statuses found:', uniqueStatuses);
  console.log('[Quote Status Debug] Total quotes:', quotesData.length);
  
  // Also check a sample of quotes with their statuses
  console.log('[Quote Status Sample]:', quotesData.slice(0, 5).map(q => ({
    quote_number: q.quote_number,
    status: q.status,
    sent_date: q.sent_date,
    converted_date: q.converted_date
  })));
  
  // Debug week calculation
  const debugWeekStart = new Date(estToday);
  debugWeekStart.setDate(estToday.getDate() - estToday.getDay());
  debugWeekStart.setHours(0, 0, 0, 0);
  const debugWeekEnd = new Date(debugWeekStart);
  debugWeekEnd.setDate(debugWeekStart.getDate() + 7);
  
  console.log('[Week Debug]', {
    estToday: estToday.toISOString(),
    estTodayDay: estToday.toLocaleDateString('en-US', { weekday: 'long' }),
    weekStart: debugWeekStart.toISOString(),
    weekEnd: debugWeekEnd.toISOString(),
    weekStartDate: debugWeekStart.toLocaleDateString(),
    weekEndDate: debugWeekEnd.toLocaleDateString()
  });
  
  quotesData.forEach((quote, index) => {
    const sentDate = parseDate(quote.sent_date);
    const convertedDate = parseDate(quote.converted_date);
    
    // Debug first few quotes
    if (index < 3) {
      console.log('[Quote Debug]', {
        quote_number: quote.quote_number,
        sent_date: quote.sent_date,
        converted_date: quote.converted_date,
        parsedSentDate: sentDate ? sentDate.toISOString() : null,
        parsedConvertedDate: convertedDate ? convertedDate.toISOString() : null,
        status: quote.status,
        isThisWeekSent: sentDate ? isThisWeek(sentDate) : false,
        isThisWeekConverted: convertedDate ? isThisWeek(convertedDate) : false
      });
    }
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
        // Handle case variations of status - check multiple possible values
        const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
        const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                           statusLower === 'accepted' || statusLower === 'complete' ||
                           (convertedDate !== null && convertedDate !== undefined);
        
        if (isConverted) {
          metrics.quotesThisWeekConverted++;
          salespersonWeekStats[sp].quotesConverted++;
          salespersonWeekStats[sp].valueConverted += totalDollars;
          
          // Debug logging for CVR calculation
          console.log('[CVR Debug] Quote sent this week and converted:', {
            quoteNumber: quote.quote_number,
            sentDate: sentDate.toLocaleDateString(),
            convertedDate: convertedDate ? convertedDate.toLocaleDateString() : 'not converted',
            status: quote.status,
            statusLower: statusLower,
            hasConvertedDate: convertedDate !== null
          });
        }
      }
      if (isLastWeek(sentDate)) {
        metrics.quotesLastWeek++;
        // Check if this quote sent last week was eventually converted
        const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
        const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                           statusLower === 'accepted' || statusLower === 'complete' ||
                           (convertedDate !== null && convertedDate !== undefined);
        if (isConverted) {
          metrics.quotesLastWeekConverted++;
        }
      }
      if (isLast30Days(sentDate)) {
        metrics.quotes30Days++;
        // Check if this quote sent in last 30 days was eventually converted
        const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
        const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                           statusLower === 'accepted' || statusLower === 'complete' ||
                           (convertedDate !== null && convertedDate !== undefined);
        if (isConverted) {
          metrics.quotes30DaysConverted++;
        }
      }
    }
    
    // Count converted quotes by conversion date
    const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
    const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                       statusLower === 'accepted' || statusLower === 'complete' ||
                       (convertedDate !== null && convertedDate !== undefined);
    if (convertedDate && isConverted) {
      salespersonStats[sp].quotesConverted++;
      salespersonStats[sp].valueConverted += totalDollars;
      
      if (isToday(convertedDate)) {
        metrics.convertedToday++;
        metrics.convertedTodayDollars += totalDollars;
        console.log('[Converted Today Debug] Quote converted today:', {
          quoteNumber: quote.quote_number,
          convertedDate: convertedDate.toLocaleDateString(),
          estToday: estToday.toLocaleDateString(),
          totalDollars
        });
      }
      if (isThisWeek(convertedDate)) {
        metrics.convertedThisWeek++;
        metrics.convertedThisWeekDollars += totalDollars;
        
        // Debug: Log the first few converted quotes to see what IDs we have
        if (recentConvertedQuotes.length < 3) {
          const jobberId = extractJobberId(quote.quote_id);
          console.log('[Jobber Link Debug] Converted quote data:', {
            quote_number: quote.quote_number,
            quote_id: quote.quote_id,
            extracted_jobber_id: jobberId,
            job_numbers: quote.job_numbers,
            client_name: quote.client_name,
            status: quote.status,
            url: jobberId ? 
              `https://secure.getjobber.com/quotes/${jobberId}` : 
              'https://secure.getjobber.com'
          });
        }
        
        // Extract the internal Jobber quote ID
        const jobberId = extractJobberId(quote.quote_id);
        
        // Log the URL we're generating for debugging
        if (jobberId) {
          console.log('[Jobber URL Debug]', {
            quote_number: quote.quote_number,
            quote_id: quote.quote_id,
            extracted_id: jobberId,
            generated_url: `https://secure.getjobber.com/quotes/${jobberId}`
          });
        }
        
        // Add to recent converted quotes
        recentConvertedQuotes.push({
          dateConverted: convertedDate.toLocaleDateString(),
          quoteNumber: quote.quote_number || quote.Quote_Number,
          jobNumber: quote.job_numbers || quote.Job_Numbers,
          date: quote.job_date ? parseDate(quote.job_date).toLocaleDateString() : '',
          jobType: quote.job_type || quote.Job_Type || 'ONE_OFF',
          clientName: quote.client_name || quote.Client_Name,
          salesPerson: quote.salesperson || quote.Salesperson,
          // Construct Jobber URL - use the internal Jobber ID
          // For now, always use quotes URL since we don't have the job's internal ID
          jobberLink: jobberId ? 
            `https://secure.getjobber.com/quotes/${jobberId}` : 
            'https://secure.getjobber.com',
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
  
  // Debug converted quotes this week
  console.log('[Converted Quotes Debug]', {
    totalConvertedThisWeek: metrics.convertedThisWeek,
    recentConvertedQuotesCount: recentConvertedQuotes.length,
    firstFewConverted: recentConvertedQuotes.slice(0, 3).map(q => ({
      dateConverted: q.dateConverted,
      quoteNumber: q.quoteNumber,
      status: q.status
    }))
  });
  
  // Process speed to lead data
  let speedToLeadDebug = {
    totalRecords: speedToLeadData.length,
    validRecords: 0,
    sumMinutes: 0
  };
  
  // Initialize speed distribution buckets - 0-24 hours combined with more granular multi-day ranges
  const speedDistribution = {
    '0-1440': 0,      // 0-24 hours
    '1440-2880': 0,   // 1-2 days
    '2880-4320': 0,   // 2-3 days
    '4320-5760': 0,   // 3-4 days
    '5760-7200': 0,   // 4-5 days
    '7200-10080': 0,  // 5-7 days
    '10080-20160': 0, // 7-14 days
    '20160+': 0       // 14+ days
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
      if (minutesToQuote < 1440) {
        speedDistribution['0-1440']++;      // 0-24 hours
      } else if (minutesToQuote < 2880) {
        speedDistribution['1440-2880']++;   // 1-2 days
      } else if (minutesToQuote < 4320) {
        speedDistribution['2880-4320']++;   // 2-3 days
      } else if (minutesToQuote < 5760) {
        speedDistribution['4320-5760']++;   // 3-4 days
      } else if (minutesToQuote < 7200) {
        speedDistribution['5760-7200']++;   // 4-5 days
      } else if (minutesToQuote < 10080) {
        speedDistribution['7200-10080']++;  // 5-7 days
      } else if (minutesToQuote < 20160) {
        speedDistribution['10080-20160']++; // 7-14 days
      } else {
        speedDistribution['20160+']++;      // 14+ days
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
  console.log('[OTB Debug] Processing', jobsData.length, 'jobs');
  console.log('[OTB Debug] Current month:', estToday.toLocaleString('default', { month: 'long', year: 'numeric' }));
  console.log('[OTB Debug] Reference date month:', now.toLocaleString('default', { month: 'long', year: 'numeric' }));
  
  // Log first 5 jobs for debugging
  jobsData.slice(0, 5).forEach(job => {
    console.log('[OTB Debug] Sample job:', {
      date: job.Date,
      value: job.Calculated_Value,
      type: job.Job_type,
      salesperson: job.SalesPerson
    });
  });
  
  jobsData.forEach(job => {
    const jobDate = parseDate(job.Date);
    const jobValue = parseFloat(job.Calculated_Value) || 0;
    
    if (isThisWeek(jobDate)) {
      metrics.thisWeekOTB += jobValue;
    }
    if (isThisMonth(jobDate)) {
      metrics.thisMonthOTB += jobValue;
    }
    
    // Calculate weekly OTB for display - include jobs from ANY month that fall in displayed weeks
    const currentMonth = estToday.getMonth();
    const currentYear = estToday.getFullYear();
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // Find the Sunday at or before the first of the month
    let weekStartDate = new Date(firstOfMonth);
    if (weekStartDate.getDay() !== 0) {
      weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
    }
    
    let weekNumber = 1;
    
    // Check all weeks that overlap with the current month
    while (weekStartDate <= lastOfMonth) {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      // If this job falls within this week (regardless of month), add it to the week's total
      if (jobDate >= weekStartDate && jobDate <= weekEndDate) {
        const weekKey = `week${weekNumber}`;
        
        console.log('[OTB Week Debug]', {
          jobDate: jobDate.toLocaleDateString(),
          jobMonth: jobDate.toLocaleString('default', { month: 'long' }),
          currentMonth: estToday.toLocaleString('default', { month: 'long' }),
          weekRange: `${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}`,
          weekNumber,
          jobValue,
          jobNumber: job.Job_Number
        });
        
        if (!metrics.weeklyOTBBreakdown[weekKey]) {
          metrics.weeklyOTBBreakdown[weekKey] = 0;
        }
        metrics.weeklyOTBBreakdown[weekKey] += jobValue;
        break; // Job found in a week, no need to check other weeks
      }
      
      // Move to next Sunday
      weekStartDate.setDate(weekStartDate.getDate() + 7);
      
      // Only increment week number if the week has at least one day in current month
      if (weekStartDate <= lastOfMonth) {
        weekNumber++;
      }
    }
    if (isNextMonth(jobDate)) {
      metrics.nextMonthOTB += jobValue;
    }
    
    // Add to monthly OTB data for 2025
    if (jobDate && jobDate.getFullYear() === 2025) {
      const month = jobDate.getMonth() + 1; // JavaScript months are 0-indexed
      metrics.monthlyOTBData[month] += jobValue;
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
  
  // Debug CVR calculation
  console.log('[CVR Calculation Debug]:', {
    quotesThisWeek: metrics.quotesThisWeek,
    quotesThisWeekConverted: metrics.quotesThisWeekConverted,
    quotesLastWeek: metrics.quotesLastWeek,
    quotesLastWeekConverted: metrics.quotesLastWeekConverted,
    convertedThisWeek: metrics.convertedThisWeek,
    convertedThisWeekDollars: metrics.convertedThisWeekDollars,
    calculatedCVRThisWeek: metrics.quotesThisWeek > 0 ? 
      parseFloat(((metrics.quotesThisWeekConverted / metrics.quotesThisWeek) * 100).toFixed(1)) : 0,
    calculatedCVRLastWeek: metrics.quotesLastWeek > 0 ? 
      parseFloat(((metrics.quotesLastWeekConverted / metrics.quotesLastWeek) * 100).toFixed(1)) : 0,
    weekStartDate: estToday.getDay() === 0 ? estToday : new Date(estToday.getTime() - (estToday.getDay() * 24 * 60 * 60 * 1000)),
    convertedToday: metrics.convertedToday,
    quotes30Days: metrics.quotes30Days,
    quotes30DaysConverted: metrics.quotes30DaysConverted,
    cvr30Days: metrics.quotes30Days > 0 ? 
      parseFloat(((metrics.quotes30DaysConverted / metrics.quotes30Days) * 100).toFixed(1)) : 0
  });
  
  // Use a smart CVR calculation:
  // - If we have conversions this week already, use this week's CVR
  // - Otherwise, use last week's CVR as a more meaningful metric
  // - This avoids showing 0% CVR just because today's quotes haven't had time to convert
  let smartWeeklyCVR = 0;
  if (metrics.quotesThisWeekConverted > 0 && metrics.quotesThisWeek > 0) {
    // We have conversions this week, use current week CVR
    smartWeeklyCVR = parseFloat(((metrics.quotesThisWeekConverted / metrics.quotesThisWeek) * 100).toFixed(1));
    console.log('[Smart CVR] Using current week CVR:', smartWeeklyCVR);
  } else if (metrics.quotesLastWeek > 0) {
    // No conversions this week yet, use last week's CVR as a proxy
    smartWeeklyCVR = parseFloat(((metrics.quotesLastWeekConverted / metrics.quotesLastWeek) * 100).toFixed(1));
    console.log('[Smart CVR] Using last week CVR as proxy:', smartWeeklyCVR);
  } else {
    console.log('[Smart CVR] No data available for CVR calculation');
  }
  
  const kpiMetrics = {
    quotesToday: metrics.quotesToday,
    convertedToday: metrics.convertedToday,
    convertedTodayDollars: metrics.convertedTodayDollars,
    quotesThisWeek: metrics.quotesThisWeek,
    convertedThisWeek: metrics.convertedThisWeek,
    convertedThisWeekDollars: metrics.convertedThisWeekDollars,
    cvrThisWeek: smartWeeklyCVR,
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
    monthlyOTBData: metrics.monthlyOTBData,
    reviewsThisWeek: reviewsThisWeek,
    // Add debug info
    debugInfo: {
      usingLastWeekCVR: metrics.quotesThisWeekConverted === 0 && metrics.quotesLastWeek > 0,
      lastWeekCVR: metrics.quotesLastWeek > 0 ? 
        parseFloat(((metrics.quotesLastWeekConverted / metrics.quotesLastWeek) * 100).toFixed(1)) : 0
    }
  };
  
  // Log weekly OTB breakdown with more detail
  console.log('[Weekly OTB Breakdown]:', metrics.weeklyOTBBreakdown);
  console.log('[This Month OTB Total]:', metrics.thisMonthOTB);
  console.log('[Current Month]:', estToday.toLocaleString('default', { month: 'long', year: 'numeric' }));
  console.log('[Monthly OTB Data for 2025]:', metrics.monthlyOTBData);
  console.log('[Next Month OTB (July 2025)]:', metrics.nextMonthOTB);
  
  // Log week ranges for debugging
  const debugMonth = estToday.getMonth();
  const debugYear = estToday.getFullYear();
  const firstDay = new Date(debugYear, debugMonth, 1);
  const lastDay = new Date(debugYear, debugMonth + 1, 0);
  console.log('[Week Ranges for', estToday.toLocaleString('default', { month: 'long', year: 'numeric' }), ']:');
  
  // Show proper Sunday-Saturday week ranges
  let debugDate = new Date(firstDay);
  if (debugDate.getDay() !== 0) {
    debugDate.setDate(debugDate.getDate() - debugDate.getDay());
  }
  
  let debugWeekNum = 1;
  while (debugDate <= lastDay) {
    const weekEnd = new Date(debugDate);
    weekEnd.setDate(debugDate.getDate() + 6);
    
    // Format the week range properly
    const startMonth = debugDate.getMonth();
    const endMonth = weekEnd.getMonth();
    let rangeStr = '';
    
    if (startMonth === endMonth) {
      rangeStr = `${debugDate.toLocaleString('default', { month: 'short' })} ${debugDate.getDate()}-${weekEnd.getDate()}`;
    } else {
      rangeStr = `${debugDate.toLocaleString('default', { month: 'short' })} ${debugDate.getDate()} - ${weekEnd.toLocaleString('default', { month: 'short' })} ${weekEnd.getDate()}`;
    }
    
    console.log(`  Week ${debugWeekNum}: ${rangeStr} = $${metrics.weeklyOTBBreakdown[`week${debugWeekNum}`] || 0}`);
    
    debugDate.setDate(debugDate.getDate() + 7);
    if (debugDate <= lastDay) {
      debugWeekNum++;
    }
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
    week: processWeekData(quotesData, now, parseDate, estToday),
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
  
  // Calculate Quote Value Flow Waterfall data for current quarter
  const currentQuarter = getCurrentQuarter();
  const quarterLabel = `Q${currentQuarter}`;
  
  
  let quarterQuotesSent = 0;
  let quarterQuotesConverted = 0;
  let quarterValueSent = 0;
  let quarterValueConverted = 0;
  
  quotesData.forEach(quote => {
    const sentDate = parseDate(quote.sent_date);
    if (sentDate && isThisQuarter(sentDate)) {
      const value = parseFloat(quote.total_dollars) || 0;
      quarterQuotesSent++;
      quarterValueSent += value;
      
      if (quote.status && quote.status.toLowerCase() === 'converted') {
        quarterQuotesConverted++;
        quarterValueConverted += value;
      }
    }
  });
  
  
  const quarterValueNotConverted = quarterValueSent - quarterValueConverted;
  
  // Build waterfall data
  const waterfallData = [
    { label: `${quarterLabel} Start`, value: 0, cumulative: 0 },
    { label: 'Quotes Sent', value: quarterValueSent, cumulative: quarterValueSent },
    { label: 'Not Converted', value: -quarterValueNotConverted, cumulative: quarterValueConverted },
    { label: 'Converted', value: quarterValueConverted, cumulative: quarterValueConverted }
  ];
  
  console.log('[Quote Value Flow Waterfall]:', {
    quarter: quarterLabel,
    quotesSent: quarterQuotesSent,
    quotesConverted: quarterQuotesConverted,
    valueSent: quarterValueSent,
    valueConverted: quarterValueConverted,
    valueNotConverted: quarterValueNotConverted,
    conversionRate: quarterQuotesSent > 0 ? ((quarterQuotesConverted / quarterQuotesSent) * 100).toFixed(1) + '%' : '0%'
  });
  
  return {
    timeSeries,
    salespersons,
    salespersonsThisWeek, // Add this week's stats
    kpiMetrics,
    recentConvertedQuotes,
    speedDistribution, // Add speed distribution data
    waterfallData, // Add waterfall data
    lastUpdated: new Date(),
    dataSource: 'bigquery'
  };
}

// Time series processing functions
function processWeekData(quotesData, referenceDate, parseDate, estToday) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = {
    labels: [],
    quotesSent: [],
    quotesConverted: [],
    conversionRate: [],
    totalSent: 0,
    totalConverted: 0
  };
  

  // Use the estToday passed from the main function for consistency
  const today = new Date(estToday);
  today.setHours(0, 0, 0, 0);
  
  // Calculate the start of the week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  console.log('[processWeekData] Week calculation:', {
    today: today.toISOString(),
    dayOfWeek: today.getDay(),
    weekStart: weekStart.toISOString(),
    weekDayName: weekDays[today.getDay()]
  });
  
  // Loop through each day of the week starting from Sunday
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    
    const dayQuotes = quotesData.filter(q => {
      const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
      return sentDate && sentDate >= date && sentDate < nextDate;
    });
    
    // For the "Converted" line: count quotes that were CONVERTED on this day
    const dayConversions = quotesData.filter(q => {
      if (!q.converted_date) return false;
      const statusLower = q.status ? q.status.toLowerCase().trim() : '';
      const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                         statusLower === 'accepted' || statusLower === 'complete' ||
                         (q.converted_date !== null && q.converted_date !== undefined);
      if (!isConverted) return false;
      const convertedDate = parseDate(q.converted_date);
      return convertedDate && convertedDate >= date && convertedDate < nextDate;
    }).length;
    
    // Debug for all days
    if (dayQuotes.length > 0) {
      console.log(`[Day ${dayOffset} - ${weekDays[date.getDay()]}] Found ${dayQuotes.length} quotes sent`);
      dayQuotes.forEach(q => {
        console.log(`  Quote ${q.quote_number}: status="${q.status}", converted_date=${q.converted_date}`);
      });
    }
    
    // For CVR calculation: count quotes SENT on this day that have converted (any time)
    const dayQuotesConverted = dayQuotes.filter(q => {
      const statusLower = q.status ? q.status.toLowerCase().trim() : '';
      const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                         statusLower === 'accepted' || statusLower === 'complete' ||
                         (q.converted_date !== null && q.converted_date !== undefined);
      return isConverted;
    }).length;
    
    const sent = dayQuotes.length;
    const converted = dayConversions;  // For the converted line (conversions on this day)
    
    // For Weekly CVR %: quotes sent on this day that have converted / quotes sent on this day
    const dailyCVR = sent > 0 ? Math.round((dayQuotesConverted / sent) * 100) : 0;
    
    // Debug logging
    console.log(`[processWeekData] ${weekDays[date.getDay()]} (${date.toISOString().split('T')[0]}):`, {
      sent: sent,
      convertedOnDay: converted,
      sentThatConverted: dayQuotesConverted,
      cvr: dailyCVR
    });
    
    // Format label with day and date (e.g., "Mon 12/25")
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateLabel = `${weekDays[date.getDay()]} ${month}/${day}`;
    
    weekData.labels.push(dateLabel);
    weekData.quotesSent.push(sent);
    weekData.quotesConverted.push(converted);
    weekData.conversionRate.push(dailyCVR);
    weekData.totalSent += sent;
    weekData.totalConverted += dayQuotesConverted;  // For overall CVR, use quotes that converted
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
    const weekQuotesConverted = weekQuotes.filter(q => {
      const statusLower = q.status ? q.status.toLowerCase().trim() : '';
      return statusLower === 'converted' || statusLower === 'won' || 
             statusLower === 'accepted' || statusLower === 'complete' ||
             (q.converted_date !== null && q.converted_date !== undefined);
    }).length;
    
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
    period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' })
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
    
    const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
    const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                       statusLower === 'accepted' || statusLower === 'complete' ||
                       (quote.converted_date !== null && quote.converted_date !== undefined);
    if (convertedDate && convertedDate.getFullYear() === currentYear && isConverted) {
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
  const totalConverted = allTimeQuotes.filter(q => {
    const statusLower = q.status ? q.status.toLowerCase().trim() : '';
    return statusLower === 'converted' || statusLower === 'won' || 
           statusLower === 'accepted' || statusLower === 'complete' ||
           (q.converted_date !== null && q.converted_date !== undefined);
  }).length;
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

// Mock data function removed for production
function getMockDashboardData_REMOVED() {
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