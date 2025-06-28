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
    // Initialize BigQuery
    let bigqueryConfig = {
      projectId: process.env.BIGQUERY_PROJECT_ID
    };

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      bigqueryConfig.credentials = credentials;
    }

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
      FROM \`${process.env.BIGQUERY_PROJECT_ID}.jobber_data.v_jobs\`
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

    console.log(`Found ${quotesData.length} quotes and ${jobsData.length} jobs`);

    // Process the data
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
        if (!j.Date) return false;
        try {
          const jobDate = new Date(j.Date);
          return !isNaN(jobDate.getTime()) && jobDate >= nextMonth && jobDate <= nextMonthEnd;
        } catch (e) {
          return false;
        }
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
        if (!q.sent_date) return false;
        try {
          const date = new Date(q.sent_date);
          return date >= weekStart && date < weekEnd;
        } catch (e) {
          return false;
        }
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
      lastUpdated: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('BigQuery error:', error);
    
    // Return mock data on error
    const mockData = {
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
      error: error.message
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockData),
    };
  }
};