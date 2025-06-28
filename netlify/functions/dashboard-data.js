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
    // Return dashboard data
    const data = {
      kpis: {
        quotesSentToday: 42,
        convertedToday: 8,
        convertedAmountToday: '$12,500',
        convertedThisWeek: 35,
        cvrThisWeek: '28.5%',
        convertedAmountThisWeek: '$87,500',
        speedToLead30Day: '1.8 hrs',
        cvr30Day: '31.2%',
        avgQPD30Day: '12.3',
        recurringRevenue2026: '$284,000',
        nextMonthOTB: '$45,200',
        weeklyHistorical: [
          { weekEnding: '6/27/2025', sent: 78, converted: 24, cvr: '30.8' },
          { weekEnding: '6/20/2025', sent: 85, converted: 28, cvr: '32.9' },
          { weekEnding: '6/13/2025', sent: 72, converted: 21, cvr: '29.2' },
          { weekEnding: '6/6/2025', sent: 69, converted: 19, cvr: '27.5' },
        ],
        otbByMonth: [
          { month: 'Jul 2025', amount: 45200 },
          { month: 'Aug 2025', amount: 52000 },
          { month: 'Sep 2025', amount: 58000 },
        ],
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};