export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // For now, return mock data to test the connection
    const mockData = {
      kpis: {
        quotesSentToday: 12,
        convertedToday: 3,
        convertedAmountToday: '$4,500',
        convertedThisWeek: 15,
        cvrThisWeek: '25.0%',
        convertedAmountThisWeek: '$22,500',
        speedToLead30Day: '2.5 hrs',
        cvr30Day: '28.5%',
        avgQPD30Day: '8.5',
        recurringRevenue2026: '$125,000',
        nextMonthOTB: '$18,500',
        weeklyHistorical: [
          { weekEnding: '6/23/2025', sent: 45, converted: 12, cvr: '26.7' },
          { weekEnding: '6/16/2025', sent: 52, converted: 15, cvr: '28.8' },
          { weekEnding: '6/9/2025', sent: 38, converted: 9, cvr: '23.7' },
        ],
        otbByMonth: [
          { month: 'Jul 2025', amount: 22500 },
          { month: 'Aug 2025', amount: 25000 },
          { month: 'Sep 2025', amount: 28000 },
        ],
        otbByWeek: [
          { weekStart: '6/30/2025', amount: 5500 },
          { weekStart: '7/7/2025', amount: 6200 },
          { weekStart: '7/14/2025', amount: 5800 },
        ],
        monthlyProjections: [
          { month: 'Jul 2025', projected: 30000, confidence: 'high' },
          { month: 'Aug 2025', projected: 35000, confidence: 'medium' },
          { month: 'Sep 2025', projected: 40000, confidence: 'medium' },
        ],
      },
      lastUpdated: new Date(),
    };

    res.status(200).json(mockData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}