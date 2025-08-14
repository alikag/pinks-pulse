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

    // Query v_quotes view - get last 90 days of data
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
      WHERE DATE(Date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
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
    
    // Debug: Show sample data and date ranges
    let debugInfo = {
      totalQuotes: quotesData.length,
      totalJobs: jobsData.length,
      sampleQuote: null,
      dateRanges: {
        quotes: { min: null, max: null },
        jobs: { min: null, max: null }
      },
      todayData: { quotes: 0, jobs: 0 },
      weekData: { quotes: 0, jobs: 0 },
      last30Data: { quotes: 0, jobs: 0 }
    };
    
    if (quotesData.length > 0) {
      debugInfo.sampleQuote = {
        sent_date: quotesData[0].sent_date,
        converted_date: quotesData[0].converted_date,
        total_dollars: quotesData[0].total_dollars,
        status: quotesData[0].status
      };
      
      // Find date ranges in quotes
      const quoteDates = quotesData
        .map(q => [q.created_at, q.sent_date, q.converted_date])
        .flat()
        .filter(d => d)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      if (quoteDates.length > 0) {
        debugInfo.dateRanges.quotes.min = new Date(Math.min(...quoteDates));
        debugInfo.dateRanges.quotes.max = new Date(Math.max(...quoteDates));
      }
    }
    
    if (jobsData.length > 0) {
      // Find date ranges in jobs
      const jobDates = jobsData
        .map(j => j.Date)
        .filter(d => d)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      if (jobDates.length > 0) {
        debugInfo.dateRanges.jobs.min = new Date(Math.min(...jobDates));
        debugInfo.dateRanges.jobs.max = new Date(Math.max(...jobDates));
      }
    }
    
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    
    // Get all-time totals for debugging
    const allTimeQuotes = quotesData.length;
    const allTimeConverted = quotesData.filter(q => q.converted_date !== null).length;
    const allTimeRevenue = quotesData
      .filter(q => q.status === 'converted' || q.status === 'approved')
      .reduce((sum, q) => sum + (parseFloat(q.total_dollars) || 0), 0);

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

    // Calculate date boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(todayStart.getDate() - 30);

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
        console.log('[Future conversion blocked]', {
          quote_number: q.quote_number,
          converted_date: q.converted_date,
          estToday: estToday.toISOString()
        });
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
        console.log('[Future conversion blocked in week]', {
          quote_number: q.quote_number,
          converted_date: q.converted_date,
          estToday: estToday.toISOString()
        });
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
      .filter(q => q.days_to_convert !== null)
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
        // Add debug info to help diagnose
        _debug: {
          allTimeQuotes,
          allTimeConverted,
          allTimeRevenue: formatCurrency(allTimeRevenue),
          dateRanges: {
            quotes: debugInfo.dateRanges.quotes,
            jobs: debugInfo.dateRanges.jobs
          },
          currentTime: now.toISOString(),
          todayBounds: {
            start: todayStart.toISOString(),
            end: todayEnd.toISOString()
          }
        }
      },
      lastUpdated: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('BigQuery error:', error);
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};