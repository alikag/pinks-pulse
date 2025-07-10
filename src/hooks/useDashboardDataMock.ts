// Temporary mock data for dashboard while BigQuery connection is being fixed
import { useState, useEffect } from 'react'
import { DashboardData } from '../types/dashboard'

// Generate realistic mock data
const generateMockData = (): DashboardData => {
  const today = new Date()
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - today.getDay())
  
  return {
    kpiMetrics: {
      quotesToday: 8,
      convertedToday: 3,
      convertedTodayDollars: 12500,
      quotesThisWeek: 42,
      convertedThisWeek: 15,
      convertedThisWeekDollars: 67500,
      cvrThisWeek: 35.7,
      quotes30Days: 312,
      converted30Days: 124,
      cvr30Days: 39.7,
      avgQPD: 10.4,
      speedToLead30Days: 1260,
      recurringRevenue2026: 875000,
      nextMonthOTB: 118000,
      thisMonthOTB: 145000,
      thisWeekOTB: 32000,
      reviewsThisWeek: 3,
      weeklyOTBBreakdown: {
        week0: 28000,
        week1: 31000,
        week2: 32000,
        week3: 29500,
        week4: 35000
      },
      monthlyOTBData: {
        1: 125000,
        2: 118000,
        3: 132000,
        4: 145000,
        5: 156000,
        6: 162000,
        7: 168000,
        8: 155000,
        9: 148000,
        10: 142000,
        11: 95000,
        12: 88000
      }
    },
    timeSeries: {
      week: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        quotesSent: [45, 52, 48, 42],
        quotesConverted: [18, 19, 17, 15],
        conversionRate: [40, 36.5, 35.4, 35.7],
        totalSent: 187,
        totalConverted: 69,
        avgConversionRate: '36.9',
        conversionChange: '+2.3',
        period: 'Last 4 Weeks'
      },
      month: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        quotesSent: [280, 295, 312, 305, 318, 325, 310],
        quotesConverted: [98, 106, 115, 119, 124, 132, 118],
        conversionRate: [35, 35.9, 36.9, 39, 39, 40.6, 38.1],
        totalSent: 2145,
        totalConverted: 812,
        avgConversionRate: '37.8',
        conversionChange: '+5.2',
        period: '2025 YTD'
      },
      year: {
        labels: ['2024', '2025'],
        quotesSent: [3200, 2145],
        quotesConverted: [1120, 812],
        conversionRate: [35, 37.8],
        totalSent: 5345,
        totalConverted: 1932,
        avgConversionRate: '36.2',
        conversionChange: '+7.9',
        period: 'Year over Year'
      },
      all: {
        labels: ['2023', '2024', '2025'],
        quotesSent: [2800, 3200, 2145],
        quotesConverted: [910, 1120, 812],
        conversionRate: [32.5, 35, 37.8],
        totalSent: 8145,
        totalConverted: 2842,
        avgConversionRate: '34.9',
        conversionChange: '+16.3',
        period: 'All Time'
      },
      currentWeekDaily: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        quotesSent: [0, 8, 9, 8, 7, 9, 1],
        quotesConverted: [0, 3, 4, 3, 2, 3, 0],
        conversionRate: [0, 37.5, 44.4, 37.5, 28.6, 33.3, 0],
        totalSent: 42,
        totalConverted: 15,
        avgConversionRate: '35.7',
        conversionChange: '-1.2',
        period: 'This Week'
      }
    },
    salespersons: [
      {
        name: 'Christian Ruddy',
        quotesSent: 89,
        quotesConverted: 36,
        conversionRate: 40.4,
        valueSent: 425000,
        valueConverted: 172000,
        color: 'rgb(147, 51, 234)',
        avgSpeedToLead: 1080
      },
      {
        name: 'Luigi',
        quotesSent: 78,
        quotesConverted: 28,
        conversionRate: 35.9,
        valueSent: 390000,
        valueConverted: 140000,
        color: 'rgb(236, 72, 153)',
        avgSpeedToLead: 1440
      },
      {
        name: 'Michael Squires',
        quotesSent: 92,
        quotesConverted: 35,
        conversionRate: 38.0,
        valueSent: 460000,
        valueConverted: 175000,
        color: 'rgb(59, 130, 246)',
        avgSpeedToLead: 1260
      }
    ],
    salespersonsThisWeek: [
      {
        name: 'Christian Ruddy',
        quotesSent: 14,
        quotesConverted: 5,
        conversionRate: 35.7,
        valueSent: 70000,
        valueConverted: 25000,
        color: 'rgb(147, 51, 234)',
        avgSpeedToLead: 980
      },
      {
        name: 'Luigi',
        quotesSent: 12,
        quotesConverted: 4,
        conversionRate: 33.3,
        valueSent: 60000,
        valueConverted: 20000,
        color: 'rgb(236, 72, 153)',
        avgSpeedToLead: 1380
      },
      {
        name: 'Michael Squires',
        quotesSent: 16,
        quotesConverted: 6,
        conversionRate: 37.5,
        valueSent: 80000,
        valueConverted: 30000,
        color: 'rgb(59, 130, 246)',
        avgSpeedToLead: 1200
      }
    ],
    recentConvertedQuotes: [
      {
        dateConverted: today.toISOString().split('T')[0],
        quoteNumber: 'Q2025-0789',
        clientName: 'Johnson Residence',
        salesPerson: 'Christian Ruddy',
        totalDollars: 4500,
        status: 'Converted'
      },
      {
        dateConverted: today.toISOString().split('T')[0],
        quoteNumber: 'Q2025-0788',
        clientName: 'Smith Office Building',
        salesPerson: 'Michael Squires',
        totalDollars: 8000,
        status: 'Converted'
      },
      {
        dateConverted: new Date(today.getTime() - 86400000).toISOString().split('T')[0],
        quoteNumber: 'Q2025-0787',
        clientName: 'Williams Estate',
        salesPerson: 'Luigi',
        totalDollars: 6500,
        status: 'Converted'
      }
    ],
    rawQuotes: [],
    rawJobs: [],
    lastUpdated: new Date(),
    dataSource: 'mock'
  }
}

export const useDashboardDataMock = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setData(generateMockData())
      setLoading(false)
      console.log('[Mock Data] Dashboard data loaded')
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const refetch = () => {
    setLoading(true)
    setTimeout(() => {
      setData(generateMockData())
      setLoading(false)
      console.log('[Mock Data] Dashboard data refreshed')
    }, 500)
  }

  return { data, loading, error, refetch }
}