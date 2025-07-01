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

  try {
    // Initialize BigQuery
    let bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }

    const bigquery = new BigQuery(bigqueryConfig);

    // Debug information
    const debugInfo = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      now: new Date().toISOString(),
      localNow: new Date().toString(),
    };

    // Query v_quotes view with debug - get recent data and date range
    const quotesDebugQuery = `
      WITH date_range AS (
        SELECT 
          MIN(created_at) as min_created,
          MAX(created_at) as max_created,
          MIN(sent_date) as min_sent,
          MAX(sent_date) as max_sent,
          MIN(converted_date) as min_converted,
          MAX(converted_date) as max_converted,
          COUNT(*) as total_count,
          COUNT(DISTINCT DATE(created_at)) as distinct_created_days,
          COUNT(DISTINCT DATE(sent_date)) as distinct_sent_days,
          COUNT(DISTINCT DATE(converted_date)) as distinct_converted_days
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_quotes\`
      )
      SELECT * FROM date_range
    `;

    const jobsDebugQuery = `
      WITH date_range AS (
        SELECT 
          MIN(Date) as min_date,
          MAX(Date) as max_date,
          COUNT(*) as total_count,
          COUNT(DISTINCT DATE(Date)) as distinct_days
        FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      )
      SELECT * FROM date_range
    `;

    // Get date ranges first
    const [quotesDateRange, jobsDateRange] = await Promise.all([
      bigquery.query(quotesDebugQuery),
      bigquery.query(jobsDebugQuery)
    ]);

    debugInfo.quotesDateRange = quotesDateRange[0][0] || {};
    debugInfo.jobsDateRange = jobsDateRange[0][0] || {};

    // Query v_quotes view - get last 90 days of data to ensure we have enough
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
      WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
         OR sent_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
         OR converted_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      ORDER BY COALESCE(created_at, sent_date, converted_date) DESC
    `;

    // Query v_jobs view - get last 90 days
    const jobsQuery = `
      SELECT 
        Job_Number,
        Client_name,
        Date,
        Calculated_Value,
        Job_Status,
        SalesPerson,
        Date_Converted
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
      WHERE Date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      ORDER BY Date DESC
    `;

    // Run both queries
    const [quotesResult, jobsResult] = await Promise.all([
      bigquery.query(quotesQuery),
      bigquery.query(jobsQuery)
    ]);

    const quotesData = quotesResult[0];
    const jobsData = jobsResult[0];

    console.log(`Found ${quotesData.length} quotes and ${jobsData.length} jobs`);
    
    // Debug: Show sample data
    debugInfo.sampleQuotes = quotesData.slice(0, 5).map(q => ({
      sent_date: q.sent_date,
      converted_date: q.converted_date,
      created_at: q.created_at,
      total_dollars: q.total_dollars,
      status: q.status
    }));

    debugInfo.sampleJobs = jobsData.slice(0, 5).map(j => ({
      Date: j.Date,
      Calculated_Value: j.Calculated_Value,
      Job_Status: j.Job_Status
    }));

    // Process the data with timezone awareness
    const now = new Date();
    
    // Helper to parse BigQuery date/timestamp to local timezone
    const parseBQDate = (dateValue) => {
      if (!dateValue) return null;
      
      // If it's a BigQuery Date object, it has a 'value' property
      if (dateValue && typeof dateValue === 'object' && dateValue.value) {
        return new Date(dateValue.value);
      }
      
      // Otherwise try to parse as string
      return new Date(dateValue);
    };
    
    // Get EST reference time for consistent date comparisons
    const estString = now.toLocaleString("en-US", {timeZone: "America/New_York"});
    const estToday = new Date(estString);
    estToday.setHours(0, 0, 0, 0);

    // Calculate date boundaries in UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(todayStart.getDate() - 30);

    debugInfo.dateCalculations = {
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      weekStart: weekStart.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString()
    };

    // Helper functions with better date handling
    const isToday = (dateValue) => {
      const date = parseBQDate(dateValue);
      if (!date || isNaN(date.getTime())) return false;
      return date >= todayStart && date <= todayEnd;
    };

    const isThisWeek = (dateValue) => {
      const date = parseBQDate(dateValue);
      if (!date || isNaN(date.getTime())) return false;
      return date >= weekStart && date <= now;
    };

    const isLast30Days = (dateValue) => {
      const date = parseBQDate(dateValue);
      if (!date || isNaN(date.getTime())) return false;
      return date >= thirtyDaysAgo && date <= now;
    };

    // Debug: Test date filtering
    const todayQuotes = quotesData.filter(q => q.sent_date && isToday(q.sent_date));
    const weekQuotes = quotesData.filter(q => q.sent_date && isThisWeek(q.sent_date));
    const thirtyDayQuotes = quotesData.filter(q => q.sent_date && isLast30Days(q.sent_date));

    debugInfo.dateFilteringTest = {
      todayQuotesCount: todayQuotes.length,
      weekQuotesCount: weekQuotes.length,
      thirtyDayQuotesCount: thirtyDayQuotes.length,
      todayQuotesSample: todayQuotes.slice(0, 3).map(q => ({
        sent_date: q.sent_date,
        parsed_date: parseBQDate(q.sent_date)?.toISOString()
      }))
    };

    // Calculate KPIs
    const quotesSentToday = quotesData.filter(q => q.sent_date && isToday(q.sent_date)).length;
    const convertedToday = quotesData.filter(q => {
      if (!q.converted_date) return false;
      const convertedDate = parseBQDate(q.converted_date);
      if (!convertedDate || isNaN(convertedDate.getTime())) return false;
      
      // Prevent counting future conversions
      const convertedEST = new Date(convertedDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
      convertedEST.setHours(0, 0, 0, 0);
      if (convertedEST > estToday) {
        debugInfo.futureConversionsBlocked = (debugInfo.futureConversionsBlocked || 0) + 1;
        return false;
      }
      
      return isToday(convertedDate);
    }).length;
    const convertedThisWeek = quotesData.filter(q => {
      if (!q.converted_date) return false;
      const convertedDate = parseBQDate(q.converted_date);
      if (!convertedDate || isNaN(convertedDate.getTime())) return false;
      
      // Prevent counting future conversions
      const convertedEST = new Date(convertedDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
      convertedEST.setHours(0, 0, 0, 0);
      if (convertedEST > estToday) {
        debugInfo.futureConversionsBlocked = (debugInfo.futureConversionsBlocked || 0) + 1;
        return false;
      }
      
      return isThisWeek(convertedDate);
    }).length;
    const quotesThisWeek = quotesData.filter(q => q.sent_date && isThisWeek(q.sent_date)).length;
    const cvrThisWeek = quotesThisWeek > 0 ? ((convertedThisWeek / quotesThisWeek) * 100).toFixed(1) : 0;

    const convertedAmountToday = quotesData
      .filter(q => {
        if (!q.converted_date) return false;
        const convertedDate = parseBQDate(q.converted_date);
        if (!convertedDate || isNaN(convertedDate.getTime())) return false;
        
        // Prevent counting future conversions
        const convertedEST = new Date(convertedDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
        convertedEST.setHours(0, 0, 0, 0);
        if (convertedEST > estToday) return false;
        
        return isToday(convertedDate);
      })
      .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

    const convertedAmountThisWeek = quotesData
      .filter(q => {
        if (!q.converted_date) return false;
        const convertedDate = parseBQDate(q.converted_date);
        if (!convertedDate || isNaN(convertedDate.getTime())) return false;
        
        // Prevent counting future conversions
        const convertedEST = new Date(convertedDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
        convertedEST.setHours(0, 0, 0, 0);
        if (convertedEST > estToday) return false;
        
        return isThisWeek(convertedDate);
      })
      .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

    const quotesLast30Days = quotesData.filter(q => q.sent_date && isLast30Days(q.sent_date));
    const convertedLast30Days = quotesLast30Days.filter(q => q.converted_date !== null).length;
    const cvr30Day = quotesLast30Days.length > 0 ? ((convertedLast30Days / quotesLast30Days.length) * 100).toFixed(1) : 0;
    const avgQPD = (quotesLast30Days.length / 30).toFixed(1);

    // Calculate speed to lead (using days_to_convert as proxy)
    const speedToLead = quotesLast30Days
      .filter(q => q.days_to_convert !== null && q.days_to_convert > 0)
      .reduce((sum, q, _, arr) => sum + q.days_to_convert / arr.length, 0);
    const speedToLeadHours = (speedToLead * 24).toFixed(1);

    // Recurring revenue estimate
    const recurringRevenue2026 = jobsData
      .reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0) * 0.2;

    // Next month OTB
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextMonthOTB = jobsData
      .filter(j => {
        const jobDate = parseBQDate(j.Date);
        return jobDate && !isNaN(jobDate.getTime()) && jobDate >= nextMonth && jobDate <= nextMonthEnd;
      })
      .reduce((sum, j) => sum + (parseFloat(j.Calculated_Value) || 0), 0);

    // Weekly historical
    const weeklyHistorical = [];
    for (let i = 0; i < 12; i++) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const weekQuotes = quotesData.filter(q => {
        const date = parseBQDate(q.sent_date);
        return date && !isNaN(date.getTime()) && date >= weekStart && date < weekEnd;
      });
      
      const converted = weekQuotes.filter(q => q.converted_date !== null).length;
      const total = weekQuotes.length;
      
      weeklyHistorical.unshift({
        weekEnding: weekEnd.toLocaleDateString(),
        sent: total,
        converted: converted,
        cvr: total > 0 ? ((converted / total) * 100).toFixed(1) : '0'
      });
    }

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    const data = {
      kpis: {
        quotesSentToday,
        convertedToday,
        convertedAmountToday: formatCurrency(convertedAmountToday),
        convertedThisWeek,
        cvrThisWeek: `${cvrThisWeek}%`,
        convertedAmountThisWeek: formatCurrency(convertedAmountThisWeek),
        speedToLead30Day: `${speedToLeadHours} hrs`,
        cvr30Day: `${cvr30Day}%`,
        avgQPD30Day: avgQPD,
        recurringRevenue2026: formatCurrency(recurringRevenue2026),
        nextMonthOTB: formatCurrency(nextMonthOTB),
        weeklyHistorical: weeklyHistorical.slice(0, 4),
        otbByMonth: [],
        otbByWeek: [],
        monthlyProjections: [
          { month: 'Jul 2025', projected: 95000, confidence: 'high' },
          { month: 'Aug 2025', projected: 105000, confidence: 'high' },
          { month: 'Sep 2025', projected: 115000, confidence: 'medium' },
          { month: 'Oct 2025', projected: 125000, confidence: 'medium' },
        ],
      },
      debugInfo,
      lastUpdated: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data, null, 2),
    };
  } catch (error) {
    console.error('BigQuery error:', error);
    
    // Return error with debug info
    const errorData = {
      kpis: {
        quotesSentToday: 0,
        convertedToday: 0,
        convertedAmountToday: '$0',
        convertedThisWeek: 0,
        cvrThisWeek: '0%',
        convertedAmountThisWeek: '$0',
        speedToLead30Day: '0 hrs',
        cvr30Day: '0%',
        avgQPD30Day: '0',
        recurringRevenue2026: '$0',
        nextMonthOTB: '$0',
        weeklyHistorical: [],
        otbByMonth: [],
        otbByWeek: [],
        monthlyProjections: [],
      },
      lastUpdated: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(errorData, null, 2),
    };
  }
};