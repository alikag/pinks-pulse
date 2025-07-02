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
  
  // Add debug endpoint to check join issue
  if (event.path && event.path.includes('/debug-join')) {
    try {
      const bigqueryConfig = {
        projectId: process.env.BIGQUERY_PROJECT_ID
      };
      
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        bigqueryConfig.credentials = credentials;
      }
      
      const bigquery = new BigQuery(bigqueryConfig);
      
      // Query to debug the join and check for duplicates
      const debugQuery = `
        WITH job_counts AS (
          SELECT 
            Job_Number,
            COUNT(*) as job_count
          FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
          GROUP BY Job_Number
          HAVING COUNT(*) > 1
        )
        SELECT 
          q.quote_number,
          q.status,
          q.job_numbers as quote_job_numbers,
          q.converted_date as quote_converted_date,
          j.Job_Number as job_number,
          j.Date_Converted as job_date_converted,
          j.Date as job_scheduled_date,
          jc.job_count as duplicate_count
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
        LEFT JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` j
          ON q.job_numbers = CAST(j.Job_Number AS STRING)
        LEFT JOIN job_counts jc
          ON j.Job_Number = jc.Job_Number
        WHERE q.status IN ('Converted', 'Won')
          AND q.sent_date >= '2025-06-01'
        ORDER BY jc.job_count DESC NULLS LAST
        LIMIT 20
      `;
      
      const [rows] = await bigquery.query(debugQuery);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Join debug data',
          samples: rows,
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
  
  // Add debug endpoint to check specific quote
  if (event.path && event.path.includes('/debug-quote-676')) {
    try {
      const bigqueryConfig = {
        projectId: process.env.BIGQUERY_PROJECT_ID
      };
      
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        bigqueryConfig.credentials = credentials;
      }
      
      const bigquery = new BigQuery(bigqueryConfig);
      
      // Query to check quotes with potential date mismatches
      const debugQuery = `
        WITH quote_job_comparison AS (
          SELECT 
            q.quote_number,
            q.status,
            q.job_numbers,
            q.sent_date,
            q.converted_date as quote_converted_date,
            j.Job_Number,
            j.Date_Converted as job_date_converted,
            j.Date as job_scheduled_date,
            -- Compare the dates
            CASE 
              WHEN CAST(q.converted_date AS DATE) != PARSE_DATE('%Y-%m-%d', j.Date_Converted) 
              THEN 'MISMATCH'
              ELSE 'MATCH'
            END as date_comparison
          FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
          LEFT JOIN \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\` j
            ON q.job_numbers = CAST(j.Job_Number AS STRING)
          WHERE q.status IN ('Converted', 'Won')
            AND q.sent_date >= '2025-06-20'
            AND j.Date_Converted IS NOT NULL
        )
        SELECT * FROM quote_job_comparison
        WHERE quote_number = '676' 
           OR date_comparison = 'MISMATCH'
        ORDER BY date_comparison DESC, quote_number
        LIMIT 20
      `;
      
      const [rows] = await bigquery.query(debugQuery);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Quote 676 debug data',
          data: rows
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
    // QUERY 1: FETCH ALL QUOTES DATA WITH JOB CONVERSION DATES
    // ============================================
    // Purpose: Get all quotes with ACCURATE conversion dates from jobs table
    // This fixes the issue where quote approval date differs from job creation date
    const quotesQuery = `
      WITH job_conversion_dates AS (
        -- Get the earliest conversion date for each job number
        -- This handles recurring jobs that might have multiple entries
        SELECT 
          CAST(Job_Number AS STRING) as job_number_str,
          MIN(PARSE_DATE('%Y-%m-%d', Date_Converted)) as earliest_conversion_date
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
        WHERE Date_Converted IS NOT NULL
        GROUP BY Job_Number
      )
      SELECT 
        q.quote_number,
        q.quote_id,
        q.client_name,
        q.salesperson,
        q.status,
        q.total_dollars,
        q.sent_date,
        -- Use job's conversion date if available, otherwise fall back to quote's converted_date
        COALESCE(
          j.earliest_conversion_date,
          CAST(q.converted_date AS DATE)
        ) as converted_date,
        q.days_to_convert,
        q.job_numbers
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\` q
      LEFT JOIN job_conversion_dates j
        ON j.job_number_str = q.job_numbers
      WHERE q.sent_date IS NOT NULL
        AND q.sent_date >= '2025-03-01'
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
    const queryStartTime = Date.now();
    
    let quotesData, jobsData, speedToLeadData, reviewsData;
    
    try {
      // Add timeout to prevent Netlify function timeout
      const queryTimeout = 9000; // 9 seconds (leaving 1s buffer for processing)
      
      // Execute main queries in parallel for better performance with timeout
      console.log('[dashboard-data-sales] Starting parallel queries with 9s timeout...');
      const queryPromises = Promise.all([
        bigquery.query({ query: quotesQuery, timeoutMs: queryTimeout }),
        bigquery.query({ query: jobsQuery, timeoutMs: queryTimeout }),
        bigquery.query({ query: speedToLeadQuery, timeoutMs: queryTimeout })
      ]);
      
      [[quotesData], [jobsData], [speedToLeadData]] = await Promise.race([
        queryPromises,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout - exceeded 9 seconds')), queryTimeout)
        )
      ]);
      
      // Try to get reviews count, but don't fail if it doesn't work
      try {
        [reviewsData] = await bigquery.query({ query: reviewsQuery, timeoutMs: 2000 });
      } catch (reviewErr) {
        console.log('[dashboard-data-sales] Reviews query failed (non-critical):', reviewErr.message);
        reviewsData = [{ reviews_count: 0 }];
      }
    } catch (queryError) {
      console.error('[dashboard-data-sales] Critical query error:', queryError);
      throw new Error(`BigQuery query failed: ${queryError.message}`);
    }
    
    const queryEndTime = Date.now();
    console.log(`[dashboard-data-sales] Queries completed in ${queryEndTime - queryStartTime}ms`);
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
      // Manually set to 1 for Kathryn Heekin's review today
      const reviewsThisWeek = 1; // reviewsData[0]?.reviews_count || 0;
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
  // Helper to get current EST/EDT timezone offset
  const getESTOffset = (dateToCheck = new Date()) => {
    // Simple approach: check if the date falls within EDT period
    // EDT runs from second Sunday in March to first Sunday in November
    const year = dateToCheck.getFullYear();
    const month = dateToCheck.getMonth(); // 0-11
    const date = dateToCheck.getDate();
    
    // Get second Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const marchDay = march.getDay();
    const secondSundayMarch = 14 - marchDay + (marchDay === 0 ? 0 : 7);
    
    // Get first Sunday in November
    const november = new Date(year, 10, 1); // November 1st
    const novemberDay = november.getDay();
    const firstSundayNovember = 1 + (7 - novemberDay) % 7;
    
    // Check if date is in EDT period
    if (month > 2 && month < 10) {
      // April through October - definitely EDT
      return '-04:00';
    } else if (month === 2) {
      // March - check if after second Sunday
      return date >= secondSundayMarch ? '-04:00' : '-05:00';
    } else if (month === 10) {
      // November - check if before first Sunday
      return date < firstSundayNovember ? '-04:00' : '-05:00';
    } else {
      // December through February - EST
      return '-05:00';
    }
  };
  
  // Helper function to parse dates - defined at the top
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    try {
      // Handle BigQuery date objects that come as { value: "2025-06-27" }
      if (typeof dateStr === 'object' && dateStr.value) {
        // Create a temporary date to check the offset for that specific date
        const tempDate = new Date(dateStr.value + 'T12:00:00Z'); // Use noon UTC to avoid edge cases
        const offset = getESTOffset(tempDate);
        
        // Parse as EST/EDT timezone
        const date = new Date(dateStr.value + 'T00:00:00' + offset);
        
        // DEBUG: Log conversion for problematic dates
        if (dateStr.value && (dateStr.value.includes('2025-06-29') || dateStr.value.includes('2025-06-30') || dateStr.value.includes('2025-07-01'))) {
          console.log('[DATE PARSE DEBUG - Object]', {
            input: dateStr,
            offset: offset,
            constructed_string: dateStr.value + 'T00:00:00' + offset,
            result_iso: date.toISOString(),
            result_est: date.toLocaleDateString("en-US", {timeZone: "America/New_York"})
          });
        }
        
        return date;
      }
      
      // Handle UTC timestamp strings like "2025-06-27 17:05:33.000000 UTC"
      if (typeof dateStr === 'string' && dateStr.includes('UTC')) {
        // Remove the microseconds and UTC suffix
        const cleanedDate = dateStr.replace(/\.\d{6} UTC$/, '').replace(' ', 'T') + 'Z';
        const date = new Date(cleanedDate);
        
        // DEBUG: Log UTC conversion for problematic dates
        if (dateStr.includes('2025-06-29') || dateStr.includes('2025-06-30') || dateStr.includes('2025-07-01')) {
          console.log('[DATE PARSE DEBUG - UTC]', {
            input: dateStr,
            cleaned: cleanedDate,
            result_iso: date.toISOString(),
            result_est: date.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
            result_est_full: date.toLocaleString("en-US", {timeZone: "America/New_York"})
          });
        }
        
        return date;
      }
      
      // For string dates without time, assume EST/EDT
      if (typeof dateStr === 'string' && !dateStr.includes('T')) {
        // Create a temporary date to check the offset for that specific date
        const tempDate = new Date(dateStr + 'T12:00:00Z');
        const offset = getESTOffset(tempDate);
        const date = new Date(dateStr + 'T00:00:00' + offset);
        
        // DEBUG: Log string conversion for problematic dates
        if (dateStr.includes('2025-06-29') || dateStr.includes('2025-06-30') || dateStr.includes('2025-07-01')) {
          console.log('[DATE PARSE DEBUG - String]', {
            input: dateStr,
            offset: offset,
            constructed_string: dateStr + 'T00:00:00' + offset,
            result_iso: date.toISOString(),
            result_est: date.toLocaleDateString("en-US", {timeZone: "America/New_York"})
          });
        }
        
        return date;
      }
      
      return new Date(dateStr);
    } catch (e) {
      console.error('[parseDate] Error parsing date:', dateStr, e);
      return null;
    }
  };

  // CRITICAL FIX: Always use the actual current date, not "most recent activity"
  const now_utc = new Date();
  
  // Don't use "most recent activity" date - that's what was causing July 1st to show June 30th data!
  console.log('🟢 Using ACTUAL current date:', now_utc.toISOString());
  
  // Get the current time in EST as a string, then parse it back
  const estDateString = now_utc.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
  
  // Parse the EST date string to get proper EST date
  // Format is MM/DD/YYYY, need to convert to YYYY-MM-DD for parsing
  const [month, day, year] = estDateString.split('/');
  // Get the proper offset for today's date
  const todayOffset = getESTOffset(now_utc);
  const estTodayString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00${todayOffset}`;
  const estToday = new Date(estTodayString);
  
  // CRITICAL DEBUG: What date is being used as "today"?
  console.log('🔴🔴🔴 CRITICAL: What is "today" being set to?', {
    now_utc: now_utc.toISOString(),
    estDateString: estDateString,
    todayOffset: todayOffset,
    estTodayString: estTodayString,
    estToday_ISO: estToday.toISOString(),
    estToday_local: estToday.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
    actual_current_time: new Date().toLocaleString("en-US", {timeZone: "America/New_York"})
  });
  
  // Enhanced debugging for date issues
  const currentESTTime = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  console.log('[Date Calculation Debug - ROOT CAUSE FIX]', {
    server_time_UTC: now_utc.toISOString(),
    current_EST_time_full: currentESTTime,
    estDateString: estDateString,
    estTodayString: estTodayString,
    estToday_constructed: estToday.toString(),
    estToday_ISO: estToday.toISOString(),
    estToday_dateOnly: estToday.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
    dayOfWeek: estToday.getDay(),
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][estToday.getDay()],
    referenceDate: now_utc.toLocaleDateString(),
    now: now_utc.toLocaleDateString()
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
    
    // Get the date components in EST
    const dateEstStr = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Get the date in EST timezone for future comparison
    const dateInEST = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const isNotFuture = dateInEST <= estToday;
    
    // Compare with today's EST date string AND ensure it's not in the future
    const isMatchingDate = dateEstStr === estDateString;
    
    if (isMatchingDate && !isNotFuture) {
      console.log('[Future conversion blocked in isToday]', {
        quote_converted_date: date.toISOString(),
        dateInEST: dateInEST.toISOString(),
        estToday: estToday.toISOString(),
        reason: 'Future date within same day'
      });
    }
    
    return isMatchingDate && isNotFuture;
  };
  
  const isThisWeek = (date) => {
    if (!date) return false;
    
    // Get the date in EST components
    const dateParts = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    const dateInEST = new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[0]) - 1, // month (0-indexed)
      parseInt(dateParts[1]), // day
      0, 0, 0, 0
    );
    
    // Calculate week boundaries
    const weekStart = new Date(estToday);
    weekStart.setDate(estToday.getDate() - estToday.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    // Check if date is in this week AND not in the future
    const isInWeekRange = dateInEST >= weekStart && dateInEST < weekEnd;
    const isNotFuture = dateInEST <= estToday;
    
    return isInWeekRange && isNotFuture;
  };
  
  const isLastWeek = (date) => {
    if (!date) return false;
    
    // Get the date in EST components
    const dateParts = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    const dateInEST = new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[0]) - 1, // month (0-indexed)
      parseInt(dateParts[1]), // day
      0, 0, 0, 0
    );
    
    // Last week's Sunday-Saturday
    const lastWeekStart = new Date(estToday);
    lastWeekStart.setDate(estToday.getDate() - estToday.getDay() - 7); // Last Sunday
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
    return dateInEST >= lastWeekStart && dateInEST < lastWeekEnd;
  };
  
  const isThisMonth = (date) => {
    if (!date) return false;
    
    // Get the date in EST components
    const dateParts = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    const dateInEST = new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[0]) - 1, // month (0-indexed)
      parseInt(dateParts[1]), // day
      0, 0, 0, 0
    );
    
    // Use actual current date (estToday) for month comparison, not reference date
    return dateInEST.getMonth() === estToday.getMonth() && dateInEST.getFullYear() === estToday.getFullYear();
  };
  
  const isNextMonth = (date) => {
    if (!date) return false;
    
    // Get the date in EST components
    const dateParts = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    const dateInEST = new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[0]) - 1, // month (0-indexed)
      parseInt(dateParts[1]), // day
      0, 0, 0, 0
    );
    
    // Use actual current date (estToday) for next month calculation
    const nextMonth = new Date(estToday);
    nextMonth.setMonth(estToday.getMonth() + 1);
    return dateInEST.getMonth() === nextMonth.getMonth() && dateInEST.getFullYear() === nextMonth.getFullYear();
  };
  
  const isLast30Days = (date) => {
    if (!date) return false;
    
    // Get the date in EST components
    const dateParts = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    const dateInEST = new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[0]) - 1, // month (0-indexed)
      parseInt(dateParts[1]), // day
      0, 0, 0, 0
    );
    
    const thirtyDaysAgo = new Date(estToday);
    thirtyDaysAgo.setDate(estToday.getDate() - 30);
    return dateInEST >= thirtyDaysAgo && dateInEST <= estToday;
  };
  
  // Get current quarter (1-4)
  const getCurrentQuarter = () => {
    const month = estToday.getMonth(); // 0-11
    return Math.floor(month / 3) + 1;
  };
  
  // Check if date is in current quarter
  const isThisQuarter = (date) => {
    if (!date) return false;
    
    // Get the date in EST components
    const dateParts = date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/');
    
    const dateInEST = new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[0]) - 1, // month (0-indexed)
      parseInt(dateParts[1]), // day
      0, 0, 0, 0
    );
    
    const currentQuarter = getCurrentQuarter();
    const currentYear = estToday.getFullYear();
    
    const quarterStartMonth = (currentQuarter - 1) * 3;
    const quarterStart = new Date(currentYear, quarterStartMonth, 1);
    const quarterEnd = new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59, 999);
    
    return dateInEST >= quarterStart && dateInEST <= quarterEnd;
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
    weeklyOTBBreakdown: {        // Week-by-week OTB for 5-week chart
      week0: 0,
      week1: 0,
      week2: 0,
      week3: 0,
      week4: 0
    },
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
      console.log('[Quote Debug - Clean]', {
        quote_number: quote.quote_number,
        sent_date: quote.sent_date,
        converted_date: quote.converted_date,
        parsedSentDate: sentDate ? sentDate.toISOString() : null,
        parsedConvertedDate: convertedDate ? convertedDate.toISOString() : null,
        status: quote.status,
        isToday_sent: sentDate ? isToday(sentDate) : false,
        isToday_converted: convertedDate ? isToday(convertedDate) : false,
        isThisWeek_sent: sentDate ? isThisWeek(sentDate) : false,
        isThisWeek_converted: convertedDate ? isThisWeek(convertedDate) : false
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
      
      // SPECIFIC DEBUG: Track the exact quotes from Jobber data
      const jobberQuotes = ['678', '676', '667', '657', '176'];
      if (jobberQuotes.includes(quote.quote_number)) {
        console.log('[JOBBER QUOTE TRACKING]', {
          quote_number: quote.quote_number,
          client_name: quote.client_name,
          raw_converted_date: quote.converted_date,
          parsed_converted_date: convertedDate.toISOString(),
          convertedDate_EST: convertedDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
          convertedDate_full_EST: convertedDate.toLocaleString("en-US", {timeZone: "America/New_York"}),
          isToday_result: isToday(convertedDate),
          isThisWeek_result: isThisWeek(convertedDate),
          estToday_EST: estDateString,
          totalDollars
        });
      }
      
      if (isToday(convertedDate)) {
        console.log('🚨🚨🚨 CONVERTED TODAY FOUND - THIS SHOULD NOT HAPPEN ON 7/1! 🚨🚨🚨', {
          quoteNumber: quote.quote_number,
          clientName: quote.client_name,
          raw_converted_date: quote.converted_date,
          parsed_converted_date: convertedDate.toISOString(),
          convertedDate_EST: convertedDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
          convertedDate_FULL_EST: convertedDate.toLocaleString("en-US", {timeZone: "America/New_York"}),
          estToday_EST: estDateString,
          totalDollars,
          isToday_result: isToday(convertedDate),
          status: quote.status
        });
        
        // EMERGENCY CHECK: Is this actually July 1st?
        const estDateParts = convertedDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}).split('/');
        const isActuallyJuly1 = estDateParts[0] === '7' && estDateParts[1] === '1';
        
        if (!isActuallyJuly1) {
          console.error(`❌❌❌ CRITICAL BUG: Quote ${quote.quote_number} (${quote.client_name}) converted on ${convertedDate.toLocaleDateString("en-US", {timeZone: "America/New_York"})} but isToday() returned true for July 1st!`);
        }
        
        metrics.convertedToday++;
        metrics.convertedTodayDollars += totalDollars;
      }
      if (isThisWeek(convertedDate)) {
        console.log('[Conversion Added To This Week - Clean]', {
          quote_number: quote.quote_number,
          converted_date: quote.converted_date,
          convertedDate_EST: convertedDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
          totalDollars
        });
        
        metrics.convertedThisWeek++;
        metrics.convertedThisWeekDollars += totalDollars;
        
        // Also update salesperson weekly stats for conversions this week
        if (!salespersonWeekStats[sp]) {
          salespersonWeekStats[sp] = {
            name: sp,
            quotesSent: 0,
            quotesConverted: 0,
            valueSent: 0,
            valueConverted: 0,
            speedToLeadSum: 0,
            speedToLeadCount: 0
          };
        }
        // Only increment if not already counted (quote sent this week that converted)
        if (!isThisWeek(sentDate)) {
          salespersonWeekStats[sp].quotesConverted++;
          salespersonWeekStats[sp].valueConverted += totalDollars;
        }
        
        
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
        {
          recentConvertedQuotes.push({
            dateConverted: convertedDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
            quoteNumber: quote.quote_number || quote.Quote_Number,
            jobNumber: quote.job_numbers || quote.Job_Numbers,
            date: quote.job_date ? parseDate(quote.job_date).toLocaleDateString("en-US", {timeZone: "America/New_York"}) : '',
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
  console.log('[OTB Debug] Reference date month:', now_utc.toLocaleString('default', { month: 'long', year: 'numeric' }));
  
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
    
    // Calculate weekly OTB for 5-week display
    // Find the current week's Sunday
    const currentWeekStart = new Date(estToday);
    if (currentWeekStart.getDay() !== 0) {
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    }
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Calculate 5 weeks centered on current week (2 before, current, 2 after)
    const weeksToShow = 5;
    const weeksBefore = 2;
    
    // Start from 2 weeks before current week
    const startWeek = new Date(currentWeekStart);
    startWeek.setDate(startWeek.getDate() - (weeksBefore * 7));
    
    // Process each of the 5 weeks
    for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(startWeek.getDate() + (weekIndex * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Create a unique key for this week based on its position
      const weekKey = `week${weekIndex}`;
      
      // Check if this job falls within this week
      if (jobDate >= weekStart && jobDate <= weekEnd) {
        console.log('[OTB Week Debug]', {
          jobDate: jobDate.toLocaleDateString(),
          weekRange: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
          weekIndex,
          weekKey,
          jobValue,
          jobNumber: job.Job_Number,
          isCurrentWeek: weekIndex === weeksBefore
        });
        
        if (!metrics.weeklyOTBBreakdown[weekKey]) {
          metrics.weeklyOTBBreakdown[weekKey] = 0;
        }
        metrics.weeklyOTBBreakdown[weekKey] += jobValue;
        break; // Job found in a week, no need to check other weeks
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
    referenceDate: estToday.toISOString()
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
  // Calculate CVR based on quotes converted this week / quotes sent this week
  let smartWeeklyCVR = 0;
  if (metrics.quotesThisWeek > 0) {
    // Use quotes converted this week (regardless of when sent) divided by quotes sent this week
    smartWeeklyCVR = parseFloat(((metrics.convertedThisWeek / metrics.quotesThisWeek) * 100).toFixed(1));
    console.log('[Smart CVR] CVR calculation:', {
      convertedThisWeek: metrics.convertedThisWeek,
      quotesThisWeek: metrics.quotesThisWeek,
      cvr: smartWeeklyCVR
    });
  } else {
    console.log('[Smart CVR] No quotes sent this week for CVR calculation');
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
  
  // Log 5-week range details
  const debugCurrentWeekStart = new Date(estToday);
  if (debugCurrentWeekStart.getDay() !== 0) {
    debugCurrentWeekStart.setDate(debugCurrentWeekStart.getDate() - debugCurrentWeekStart.getDay());
  }
  debugCurrentWeekStart.setHours(0, 0, 0, 0);
  
  console.log('[5-Week OTB Debug]:');
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(debugCurrentWeekStart);
    weekStart.setDate(debugCurrentWeekStart.getDate() + ((i - 2) * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    console.log(`  week${i}: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()} = $${metrics.weeklyOTBBreakdown[`week${i}`] || 0}`);
  }
  
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
  const weekStart = new Date(estToday);
  weekStart.setDate(estToday.getDate() - estToday.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  console.log('[dashboard-data-sales] Week calculation:', {
    actualToday: estToday.toISOString(),
    dayOfWeek: estToday.getDay(),
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][estToday.getDay()],
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
  let timeSeries;
  try {
    timeSeries = {
      week: processWeekData(quotesData, now_utc, parseDate, estToday),
      currentWeekDaily: processCurrentWeekDaily(quotesData, now_utc, parseDate, estToday),
      month: processMonthData(quotesData, now_utc, parseDate),
      year: processYearData(quotesData, now_utc, parseDate),
      all: processAllTimeData(quotesData, now_utc, parseDate)
    };
  } catch (timeSeriesError) {
    console.error('[dashboard-data-sales] Error processing time series:', timeSeriesError);
    // Fallback to basic structure
    timeSeries = {
      week: { labels: [], quotesSent: [], quotesConverted: [], conversionRate: [], totalSent: 0, totalConverted: 0 },
      currentWeekDaily: { labels: [], quotesSent: [], quotesConverted: [], conversionRate: [], totalSent: 0, totalConverted: 0 },
      month: { labels: [], quotesSent: [], quotesConverted: [], conversionRate: [], totalSent: 0, totalConverted: 0 },
      year: { labels: [], quotesSent: [], quotesConverted: [], conversionRate: [], totalSent: 0, totalConverted: 0 },
      all: { labels: [], quotesSent: [], quotesConverted: [], conversionRate: [], totalSent: 0, totalConverted: 0 }
    };
  }
  
  console.log('[dashboard-data-sales] Week time series data:', {
    labels: timeSeries.week.labels,
    quotesSent: timeSeries.week.quotesSent,
    quotesConverted: timeSeries.week.quotesConverted,
    referenceDate: estToday.toISOString()
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
    const convertedDate = parseDate(quote.converted_date);
    const value = parseFloat(quote.total_dollars) || 0;
    
    // Count quotes sent this quarter
    if (sentDate && isThisQuarter(sentDate)) {
      quarterQuotesSent++;
      quarterValueSent += value;
    }
    
    // Count quotes converted this quarter (regardless of when sent)
    if (convertedDate && isThisQuarter(convertedDate)) {
      const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
      const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                         statusLower === 'accepted' || statusLower === 'complete' ||
                         (quote.converted_date !== null && quote.converted_date !== undefined);
      if (isConverted) {
        quarterQuotesConverted++;
        quarterValueConverted += value;
      }
    }
  });
  
  
  // Build waterfall data showing the flow of quotes this quarter
  // Track different statuses of quotes sent this quarter
  let quarterValueSentAndConverted = 0;
  let quarterValueLostOrArchived = 0;
  let quarterValuePending = 0;
  
  // Calculate status of quotes sent this quarter
  let quarterCountSentAndConverted = 0;
  let quarterCountSentAndLost = 0;
  let quarterCountSentAndPending = 0;
  
  // Debug: track all statuses we see
  const statusCounts = {};
  
  quotesData.forEach(quote => {
    const sentDate = parseDate(quote.sent_date);
    const convertedDate = parseDate(quote.converted_date);
    const value = parseFloat(quote.total_dollars) || 0;
    const statusLower = quote.status ? quote.status.toLowerCase().trim() : '';
    
    if (sentDate && isThisQuarter(sentDate)) {
      // Track status for debugging
      statusCounts[statusLower] = (statusCounts[statusLower] || 0) + 1;
      
      // Debug specific quotes
      if (quarterQuotesSent < 10) { // Only log if not too many
        console.log(`[Quote ${quote.quote_number}]`, {
          status: statusLower,
          sentDate: sentDate?.toLocaleDateString(),
          convertedDate: convertedDate?.toLocaleDateString(),
          hasConvertedDate: !!convertedDate,
          value: value
        });
      }
      
      if (convertedDate || statusLower === 'converted' || statusLower === 'won' || 
          statusLower === 'accepted' || statusLower === 'complete') {
        quarterValueSentAndConverted += value;
        quarterCountSentAndConverted++;
      } else if (statusLower === 'archived' || statusLower === 'lost' || 
                 statusLower === 'rejected' || statusLower === 'declined' || 
                 statusLower === 'dead' || statusLower === 'cancelled') {
        quarterValueLostOrArchived += value;
        quarterCountSentAndLost++;
      } else {
        // Status is likely 'sent', 'pending', 'draft', or similar
        quarterValuePending += value;
        quarterCountSentAndPending++;
      }
    }
  });
  
  console.log('[Waterfall Status Debug]:', {
    quarterLabel,
    statusCounts,
    counts: {
      sent: quarterQuotesSent,
      converted: quarterCountSentAndConverted,
      lost: quarterCountSentAndLost,
      pending: quarterCountSentAndPending
    }
  });
  
  // Calculate the actual pending amount (quotes sent but not converted or lost)
  const actualPending = quarterValueSent - quarterValueSentAndConverted - quarterValueLostOrArchived;
  
  console.log('[Waterfall Breakdown]:', {
    sent: quarterValueSent,
    converted: quarterValueSentAndConverted,
    lost: quarterValueLostOrArchived,
    pending: actualPending,
    total: quarterValueSentAndConverted + quarterValueLostOrArchived + actualPending
  });
  
  // Clear waterfall showing quote flow
  const waterfallData = [];
  
  if (quarterValueSent > 0) {
    const activeQuotes = quarterValueSent - quarterValueLostOrArchived;
    const pendingCount = quarterQuotesSent - quarterCountSentAndConverted - quarterCountSentAndLost;
    
    waterfallData.push(
      { label: `${quarterLabel} Start`, value: 0, cumulative: 0 },
      { label: 'Quotes Sent', value: quarterValueSent, cumulative: quarterValueSent }
    );
    
    // Show losses as negative (red) if any
    if (quarterValueLostOrArchived > 0) {
      waterfallData.push({
        label: `Lost/Archived (${quarterCountSentAndLost})`,
        value: -quarterValueLostOrArchived,
        cumulative: activeQuotes
      });
    }
    
    // Show conversions if any
    if (quarterValueSentAndConverted > 0) {
      waterfallData.push({
        label: `Converted (${quarterCountSentAndConverted})`,
        value: quarterValueSentAndConverted,
        cumulative: activeQuotes
      });
    }
    
    // Show final status
    if (pendingCount > 0 || quarterCountSentAndConverted > 0) {
      waterfallData.push({
        label: `Active (${quarterCountSentAndConverted} converted, ${pendingCount} pending)`,
        value: 0,
        cumulative: activeQuotes
      });
    }
  } else {
    // No quotes sent yet
    waterfallData.push(
      { label: 'No Quotes Sent This Quarter', value: 0.01, cumulative: 0.01 }
    );
  }
  
  // Final validation
  const checkSum = quarterValueSentAndConverted + quarterValueLostOrArchived + actualPending;
  const difference = Math.abs(checkSum - quarterValueSent);
  
  console.log('[Quote Value Flow Waterfall]:', {
    quarter: quarterLabel,
    breakdown: {
      sent: quarterValueSent,
      converted: quarterValueSentAndConverted,
      lost: quarterValueLostOrArchived,
      pending: actualPending,
      checkSum: checkSum,
      difference: difference
    },
    counts: {
      sent: quarterQuotesSent,
      converted: quarterQuotesConverted
    },
    waterfallData: waterfallData,
    isValid: difference < 1 // Allow for rounding errors
  });
  
  // Collect debug info for browser console
  const jobberQuoteDebug = [];
  const dateParseDebug = [];
  
  // Process the same quotes again but collect debug info
  quotesData.forEach(quote => {
    const jobberQuotes = ['678', '676', '667', '657', '176'];
    if (jobberQuotes.includes(quote.quote_number)) {
      const convertedDate = parseDate(quote.converted_date);
      jobberQuoteDebug.push({
        quote_number: quote.quote_number,
        client_name: quote.client_name,
        raw_converted_date: quote.converted_date,
        parsed_converted_date: convertedDate?.toISOString(),
        convertedDate_EST: convertedDate?.toLocaleDateString("en-US", {timeZone: "America/New_York"}),
        convertedDate_full_EST: convertedDate?.toLocaleString("en-US", {timeZone: "America/New_York"}),
        isToday_result: convertedDate ? isToday(convertedDate) : false,
        isThisWeek_result: convertedDate ? isThisWeek(convertedDate) : false,
        estToday_EST: estDateString
      });
    }
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
    dataSource: 'bigquery',
    // DEBUG INFO - will show in browser console
    debug: {
      jobberQuotes: jobberQuoteDebug,
      estToday: estDateString,
      currentESTTime: currentESTTime,
      getESTOffset: getESTOffset()
    }
  };
}

// Time series processing functions
function processCurrentWeekDaily(quotesData, referenceDate, parseDate, estToday) {
  // Show daily data for the current week (for "Converted This Week" chart)
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
  
  console.log('[processCurrentWeekDaily] Week calculation:', {
    today: today.toISOString(),
    dayOfWeek: today.getDay(),
    weekStart: weekStart.toISOString()
  });
  
  // Loop through each day of the week starting from Sunday
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);
    
    const dayQuotes = quotesData.filter(q => {
      const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
      if (!sentDate) return false;
      
      // Reset hours for comparison
      const sentDateCompare = new Date(sentDate);
      sentDateCompare.setHours(0, 0, 0, 0);
      
      // Check if the sent date falls on this specific day
      return sentDateCompare.getTime() === date.getTime();
    });
    
    // Count quotes converted on this day
    const dayConversions = quotesData.filter(q => {
      if (!q.converted_date) return false;
      const statusLower = q.status ? q.status.toLowerCase().trim() : '';
      const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                         statusLower === 'accepted' || statusLower === 'complete' ||
                         (q.converted_date !== null && q.converted_date !== undefined);
      if (!isConverted) return false;
      const convertedDate = parseDate(q.converted_date);
      if (!convertedDate) return false;
      
      // Reset hours for comparison
      const convertedDateCompare = new Date(convertedDate);
      convertedDateCompare.setHours(0, 0, 0, 0);
      
      // Check if the converted date falls on this specific day
      return convertedDateCompare.getTime() === date.getTime();
    });
    
    const sent = dayQuotes.length;
    const converted = dayConversions.length;
    
    // Format label with day and date (e.g., "Mon 12/25")
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateLabel = `${weekDays[date.getDay()]} ${month}/${day}`;
    
    weekData.labels.push(dateLabel);
    weekData.quotesSent.push(sent);
    weekData.quotesConverted.push(converted);
    weekData.totalSent += sent;
    weekData.totalConverted += converted;
  }
  
  return {
    ...weekData,
    period: 'This Week'
  };
}

function processWeekData(quotesData, referenceDate, parseDate, estToday) {
  // Show last 6 weeks of CVR data (for "Weekly Conversion Rates" chart)
  const weeksToShow = 6;
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
  
  // Calculate the start of the current week (Sunday)
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);
  
  console.log('[processWeekData] Starting weekly CVR calculation for', weeksToShow, 'weeks');
  
  // Process each of the last N weeks
  for (let weekOffset = weeksToShow - 1; weekOffset >= 0; weekOffset--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (weekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Get quotes sent during this week
    const weekQuotesSent = quotesData.filter(q => {
      const sentDate = q.sent_date ? parseDate(q.sent_date) : null;
      if (!sentDate) return false;
      
      // Direct comparison without timezone conversion (dates are already in EST from parseDate)
      return sentDate >= weekStart && sentDate <= weekEnd;
    });
    
    // Get quotes converted during this week
    const weekQuotesConverted = quotesData.filter(q => {
      if (!q.converted_date) return false;
      const statusLower = q.status ? q.status.toLowerCase().trim() : '';
      const isConverted = statusLower === 'converted' || statusLower === 'won' || 
                         statusLower === 'accepted' || statusLower === 'complete' ||
                         (q.converted_date !== null && q.converted_date !== undefined);
      if (!isConverted) return false;
      const convertedDate = parseDate(q.converted_date);
      if (!convertedDate) return false;
      
      // Direct comparison without timezone conversion (dates are already in EST from parseDate)
      return convertedDate >= weekStart && convertedDate <= weekEnd;
    });
    
    // Calculate weekly metrics
    const sent = weekQuotesSent.length;
    const converted = weekQuotesConverted.length;
    
    // Calculate weekly CVR: quotes converted this week / quotes sent this week
    const weekCVR = sent > 0 ? Math.round((converted / sent) * 100) : 0;
    
    // Format label with week start date (e.g., "Week of 6/24")
    const isCurrentWeek = weekOffset === 0;
    const weekLabel = `Week of ${weekStart.getMonth() + 1}/${weekStart.getDate()}${isCurrentWeek ? ' (current)' : ''}`;
    
    // Debug logging
    console.log(`[processWeekData] ${weekLabel}:`, {
      weekStart: weekStart.toLocaleDateString(),
      weekEnd: weekEnd.toLocaleDateString(),
      sent: sent,
      converted: converted,
      cvr: weekCVR,
      isCurrentWeek: isCurrentWeek
    });
    
    weekData.labels.push(weekLabel);
    weekData.quotesSent.push(sent);
    weekData.quotesConverted.push(converted);
    weekData.conversionRate.push(weekCVR);
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