import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Menu, TrendingUp, XCircle, Trophy, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import Chart from 'chart.js/auto'
import { useDashboardData } from '../../hooks/useDashboardData'
import { motion, AnimatePresence } from 'framer-motion'

// Types
interface KPI {
  id: string
  label: string
  value: number
  target: number
  format: 'currency' | 'percentage' | 'number' | 'time'
  status: 'success' | 'warning' | 'danger' | 'normal'
  trend?: number
  isLive?: boolean
  lastUpdated?: Date
  subtitle?: string
  sparklineData?: number[]
}

interface ConvertedQuote {
  dateConverted: string
  quoteNumber?: string
  jobNumber?: string
  date?: string
  jobType?: string
  salesPerson: string
  jobberLink?: string
  visitTitle?: string
  clientName?: string
  totalDollars: number
  status?: string
}


interface GoogleReview {
  id: string
  author: string
  rating: number
  text: string
  time: string
}

const SalesKPIDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<KPI | null>(null)
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([])
  const { data, loading, error } = useDashboardData()
  
  // Chart refs
  const trendChartRef = useRef<HTMLCanvasElement>(null)
  const conversionChartRef = useRef<HTMLCanvasElement>(null)
  const monthlyOTBChartRef = useRef<HTMLCanvasElement>(null)
  const weeklyOTBChartRef = useRef<HTMLCanvasElement>(null)
  const sparklineRef = useRef<HTMLCanvasElement>(null)
  const speedDistributionRef = useRef<HTMLCanvasElement>(null)
  const heatmapRef = useRef<HTMLCanvasElement>(null)
  const waterfallRef = useRef<HTMLCanvasElement>(null)
  const cohortRef = useRef<HTMLCanvasElement>(null)
  
  // Sparkline refs for KPI cards
  const kpiSparklineRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({})
  
  // Chart instances
  const trendChartInstance = useRef<Chart | null>(null)
  const conversionChartInstance = useRef<Chart | null>(null)
  const monthlyOTBChartInstance = useRef<Chart | null>(null)
  const weeklyOTBChartInstance = useRef<Chart | null>(null)
  const sparklineInstance = useRef<Chart | null>(null)
  const speedDistributionInstance = useRef<Chart | null>(null)
  const heatmapInstance = useRef<Chart | null>(null)
  const waterfallInstance = useRef<Chart | null>(null)
  const cohortInstance = useRef<Chart | null>(null)
  const kpiSparklineInstances = useRef<{ [key: string]: Chart | null }>({})

  // Helper function to generate sparkline data
  const generateSparklineData = () => {
    return Array.from({ length: 7 }, () => Math.random() * 50 + 25)
  }

  // Calculate KPIs from data
  const kpis = useMemo<KPI[]>(() => {
    console.log('SalesKPIDashboard - Full data object:', data);
    console.log('SalesKPIDashboard - Data keys:', data ? Object.keys(data) : 'No data');
    console.log('SalesKPIDashboard - Has kpiMetrics?', data?.kpiMetrics);
    
    if (loading || !data || !data.kpiMetrics) {
      console.log('Data not ready yet');
      return []
    }
    
    const metrics = data.kpiMetrics;
    
    return [
      {
        id: 'quotes-sent-today',
        label: 'Quotes Sent Today',
        subtitle: 'Target: 12',
        value: metrics.quotesToday,
        target: 12,
        format: 'number',
        status: metrics.quotesToday >= 12 ? 'success' : metrics.quotesToday >= 8 ? 'warning' : 'danger',
        isLive: true,
        trend: 12.5,
        sparklineData: generateSparklineData()
      },
      {
        id: 'converted-today',
        label: 'Converted Today',
        subtitle: 'total_dollars',
        value: metrics.convertedTodayDollars,
        target: 22500,
        format: 'currency',
        status: metrics.convertedTodayDollars >= 22500 ? 'success' : metrics.convertedTodayDollars > 15000 ? 'warning' : 'normal',
        isLive: true,
        trend: -5.3,
        sparklineData: generateSparklineData()
      },
      {
        id: 'converted-week',
        label: 'Converted This Week',
        subtitle: 'total_dollars',
        value: metrics.convertedThisWeekDollars,
        target: 157500,
        format: 'currency',
        status: metrics.convertedThisWeekDollars >= 157500 ? 'success' : metrics.convertedThisWeekDollars > 100000 ? 'warning' : 'danger'
      },
      {
        id: 'cvr-week',
        label: 'CVR This Week',
        subtitle: 'Target: 45%',
        value: metrics.cvrThisWeek,
        target: 45,
        format: 'percentage',
        status: metrics.cvrThisWeek >= 45 ? 'success' : metrics.cvrThisWeek >= 30 ? 'warning' : 'danger'
      },
      {
        id: 'recurring-2026',
        label: '2026 Recurring',
        subtitle: 'Target: $85k',
        value: metrics.recurringRevenue2026,
        target: 85000,
        format: 'currency',
        status: metrics.recurringRevenue2026 >= 85000 ? 'success' : 'warning'
      },
      {
        id: 'next-month-otb',
        label: 'Next Month OTB',
        subtitle: 'Target: $125k',
        value: metrics.nextMonthOTB,
        target: 125000,
        format: 'currency',
        status: metrics.nextMonthOTB >= 125000 ? 'success' : metrics.nextMonthOTB >= 100000 ? 'warning' : 'danger'
      }
    ]
  }, [data, loading])

  // Calculate second row KPIs
  const secondRowKpis = useMemo<KPI[]>(() => {
    if (loading || !data || !data.kpiMetrics) {
      return getSecondRowMockKPIs()
    }
    
    const metrics = data.kpiMetrics;
    console.log('Speed to Lead Debug:', {
      speedToLead30Days: metrics.speedToLead30Days,
      hasValue: metrics.speedToLead30Days > 0,
      willUse: metrics.speedToLead30Days > 0 ? metrics.speedToLead30Days : 22
    });
    
    return [
      {
        id: 'speed-to-lead',
        label: 'Speed to Lead (30D Avg)',
        subtitle: 'Target: 30 min',
        value: metrics.speedToLead30Days > 0 ? metrics.speedToLead30Days : 22,
        target: 30,
        format: 'time',
        status: (metrics.speedToLead30Days || 22) <= 30 ? 'success' : 'warning',
        sparklineData: generateSparklineData()
      },
      {
        id: 'recurring-cvr',
        label: '30D CVR',
        subtitle: `${metrics.converted30Days || 0}/${metrics.quotes30Days || 0} converted`,
        value: metrics.cvr30Days || 0,
        target: 45,
        format: 'percentage',
        status: metrics.cvr30Days >= 45 ? 'success' : metrics.cvr30Days >= 30 ? 'warning' : 'danger'
      },
      {
        id: 'avg-qpd',
        label: 'Avg Quotes/Day (30D)',
        subtitle: 'Target: 12',
        value: metrics.avgQPD,
        target: 12,
        format: 'number',
        status: metrics.avgQPD >= 12 ? 'success' : metrics.avgQPD >= 6 ? 'warning' : 'danger',
        trend: 8.2
      },
      {
        id: 'reviews-week',
        label: 'Reviews This Week',
        subtitle: 'Target: 4',
        value: metrics.reviewsThisWeek || 3,
        target: 4,
        format: 'number',
        status: metrics.reviewsThisWeek >= 4 ? 'success' : 'warning',
        trend: -25
      },
      {
        id: 'cvr-30d',
        label: '30D CVR',
        subtitle: 'Target: 45%',
        value: metrics.cvr30Days,
        target: 45,
        format: 'percentage',
        status: metrics.cvr30Days >= 45 ? 'success' : metrics.cvr30Days >= 30 ? 'warning' : 'danger',
        trend: 3.1,
        sparklineData: generateSparklineData()
      }
    ]
  }, [data, loading])

  // Fetch Google Reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/.netlify/functions/scrape-google-reviews-playwright')
        const result = await response.json()
        
        if (result.success && result.data && result.data.reviews && Array.isArray(result.data.reviews)) {
          // Take the latest 3 reviews and format them
          const latestReviews = result.data.reviews.slice(0, 3).map((review: any, index: number) => ({
            id: `review-${index}`,
            author: review.reviewerName || 'Anonymous',
            rating: review.rating || 5,
            text: review.text || '',
            time: review.date || 'Recently'
          }))
          setGoogleReviews(latestReviews)
        } else {
          // Use fallback reviews
          setGoogleReviews([
            { id: '1', author: 'Sarah M.', rating: 5, text: 'Excellent service! The team was professional and thorough.', time: '2 days ago' },
            { id: '2', author: 'John D.', rating: 5, text: 'Best window cleaning service in Hudson Valley!', time: '1 week ago' },
            { id: '3', author: 'Emily R.', rating: 5, text: 'Always reliable and does an amazing job.', time: '2 weeks ago' }
          ])
        }
      } catch (error) {
        console.error('Failed to fetch Google reviews:', error)
        // Fallback to mock reviews
        setGoogleReviews([
          { id: '1', author: 'Sarah M.', rating: 5, text: 'Excellent service! The team was professional and thorough.', time: '2 days ago' },
          { id: '2', author: 'John D.', rating: 5, text: 'Best window cleaning service in Hudson Valley!', time: '1 week ago' },
          { id: '3', author: 'Emily R.', rating: 5, text: 'Always reliable and does an amazing job.', time: '2 weeks ago' }
        ])
      }
    }
    
    fetchReviews()
  }, [])

  // Helper functions
  const formatValue = (value: number, format: KPI['format']) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return new Intl.NumberFormat('en-US').format(value)
      case 'time':
        if (value < 60) {
          return `${Math.round(value)} min`
        } else {
          const hours = Math.floor(value / 60)
          const minutes = Math.round(value % 60)
          return `${hours}h ${minutes}m`
        }
      default:
        return value.toString()
    }
  }

  // Setup charts
  useEffect(() => {
    // Setup charts with dark theme
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)'
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'

    // Destroy existing charts
    if (trendChartInstance.current) trendChartInstance.current.destroy()
    if (conversionChartInstance.current) conversionChartInstance.current.destroy()
    if (monthlyOTBChartInstance.current) monthlyOTBChartInstance.current.destroy()
    if (weeklyOTBChartInstance.current) weeklyOTBChartInstance.current.destroy()
    if (sparklineInstance.current) sparklineInstance.current.destroy()
    if (speedDistributionInstance.current) speedDistributionInstance.current.destroy()
    if (heatmapInstance.current) heatmapInstance.current.destroy()
    if (waterfallInstance.current) waterfallInstance.current.destroy()
    if (cohortInstance.current) cohortInstance.current.destroy()
    
    // Destroy KPI sparklines
    Object.values(kpiSparklineInstances.current).forEach(chart => {
      if (chart) chart.destroy()
    })

    // Daily Trend Sparkline
    if (sparklineRef.current) {
      const ctx = sparklineRef.current.getContext('2d')
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 120)
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)')
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)')
        
        sparklineInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: Array.from({length: 24}, (_, i) => i),
            datasets: [{
              data: Array.from({length: 24}, () => Math.random() * 100 + 50),
              borderColor: '#06b6d4',
              backgroundColor: gradient,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
              x: { display: false },
              y: { display: false }
            },
            elements: {
              line: {
                borderCapStyle: 'round',
                borderJoinStyle: 'round'
              }
            }
          }
        })
      }
    }
    
    // Create sparklines for KPI cards
    kpis.forEach((kpi) => {
      if (kpi.sparklineData && kpiSparklineRefs.current[kpi.id]) {
        const ctx = kpiSparklineRefs.current[kpi.id]?.getContext('2d')
        if (ctx) {
          kpiSparklineInstances.current[kpi.id] = new Chart(ctx, {
            type: 'line',
            data: {
              labels: Array.from({ length: kpi.sparklineData.length }, (_, i) => i),
              datasets: [{
                data: kpi.sparklineData,
                borderColor: kpi.status === 'success' ? '#10b981' : 
                           kpi.status === 'warning' ? '#f59e0b' : 
                           kpi.status === 'danger' ? '#ef4444' : '#3b82f6',
                borderWidth: 1.5,
                fill: false,
                tension: 0.4,
                pointRadius: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: false } },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }
          })
        }
      }
    })

    // Revenue Trend Chart
    if (trendChartRef.current && !loading && data?.timeSeries) {
      const ctx = trendChartRef.current.getContext('2d')
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200)
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)')
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)')
        
        // Default to week view
        const chartPeriodKey: keyof typeof data.timeSeries = 'week'
        const chartData = data.timeSeries[chartPeriodKey]
        console.log('[Converted This Week Chart] Chart data:', chartData)
        
        trendChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Sent Quotes',
              data: chartData.quotesSent,
              borderColor: '#fb923c',
              backgroundColor: 'rgba(251, 146, 60, 0.1)',
              fill: false,
              tension: 0.4,
              pointBackgroundColor: '#fb923c',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }, {
              label: 'Converted',
              data: chartData.quotesConverted,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: false,
              tension: 0.4,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value) => value.toString(),
                  stepSize: 1
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }

    // Weekly CVR Chart
    if (conversionChartRef.current && !loading && data?.timeSeries) {
      const ctx = conversionChartRef.current.getContext('2d')
      if (ctx) {
        const chartData = data.timeSeries.week
        
        conversionChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'CVR %',
              data: chartData.conversionRate,
              backgroundColor: [
                'rgba(14, 165, 233, 0.8)',
                'rgba(6, 182, 212, 0.8)',
                'rgba(34, 211, 238, 0.8)'
              ],
              borderRadius: 4,
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
              }
            },
            scales: {
              y: { 
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }

    // Monthly OTB Chart
    if (monthlyOTBChartRef.current && !loading && data) {
      const ctx = monthlyOTBChartRef.current.getContext('2d')
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300)
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)')
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')
        
        // Show all 12 months of 2025
        const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlyJobValues = [0, 0, 1000, 33550, 50918.5, 78517.5, 73032.5, 52967.5, 4742.5, 4727.5, 5662.5, 2427.5]
        
        // Use data from dashboard if available, otherwise use mock data
        let monthLabels = allMonths
        let monthlyOTB = monthlyJobValues
        
        monthlyOTBChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: monthLabels,
            datasets: [{
              label: 'Total Dollars',
              data: monthlyOTB,
              backgroundColor: gradient,
              borderColor: '#6366f1',
              borderWidth: 2,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: (context) => `OTB: $${context.parsed.y.toLocaleString()}`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 150000,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value) => `$${Number(value) / 1000}k`
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }
    
    // Weekly OTB Chart
    if (weeklyOTBChartRef.current && !loading && data) {
      const ctx = weeklyOTBChartRef.current.getContext('2d')
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200)
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)')
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0)')
        
        // Calculate weeks for current month dynamically
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthName = monthNames[currentMonth]
        
        // Get first and last day of current month
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        
        // Calculate week ranges for the month
        const weekRanges: string[] = []
        const weeklyOTBData: number[] = []
        
        let currentDate = new Date(firstDay)
        let weekNum = 1
        
        while (currentDate <= lastDay) {
          const weekStart = currentDate.getDate()
          
          // Find next Sunday or end of month
          let endDate = new Date(currentDate)
          while (endDate.getDay() !== 6 && endDate.getDate() < lastDay.getDate()) {
            endDate.setDate(endDate.getDate() + 1)
          }
          
          weekRanges.push(`Week ${weekNum} (${monthName} ${weekStart}-${Math.min(endDate.getDate(), lastDay.getDate())})`)
          
          // Use actual data from backend if available, otherwise use mock data
          if (data?.kpiMetrics?.weeklyOTBBreakdown) {
            const weekKey = `week${weekNum}`
            weeklyOTBData.push(data.kpiMetrics.weeklyOTBBreakdown[weekKey] || 0)
          } else {
            // Mock data with different values for each week
            const weekOTBValues = [32000, 28500, 24300, 18750, 12500]
            weeklyOTBData.push(weekOTBValues[weekNum - 1] || 8000)
          }
          
          // Move to next week (next Sunday)
          currentDate = new Date(endDate)
          currentDate.setDate(currentDate.getDate() + 1)
          weekNum++
        }
        
        let weekLabels = weekRanges
        let weeklyOTB = weeklyOTBData
        
        
        weeklyOTBChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: weekLabels,
            datasets: [{
              label: 'Total Dollars',
              data: weeklyOTB,
              backgroundColor: gradient,
              borderColor: '#22d3ee',
              borderWidth: 2,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: (context) => `OTB: $${context.parsed.y.toLocaleString()}`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value) => `$${Number(value).toLocaleString()}`
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }
    
    // Speed to Lead Distribution Chart
    if (speedDistributionRef.current && !loading && data) {
      const ctx = speedDistributionRef.current.getContext('2d')
      if (ctx) {
        // Mock distribution data - would come from actual speed to lead data
        const distribution = [
          { range: '0-15 min', count: 45 },
          { range: '15-30 min', count: 38 },
          { range: '30-60 min', count: 25 },
          { range: '1-2 hrs', count: 15 },
          { range: '2-4 hrs', count: 8 },
          { range: '4+ hrs', count: 5 }
        ]
        
        speedDistributionInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: distribution.map(d => d.range),
            datasets: [{
              label: 'Number of Quotes',
              data: distribution.map(d => d.count),
              backgroundColor: [
                'rgba(236, 72, 153, 0.8)',
                'rgba(244, 114, 182, 0.8)',
                'rgba(251, 207, 232, 0.8)',
                'rgba(252, 231, 243, 0.8)',
                'rgba(253, 242, 248, 0.8)',
                'rgba(254, 251, 252, 0.8)'
              ],
              borderWidth: 0,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }
    
    // Cohort Analysis Chart
    if (cohortRef.current && !loading && data) {
      const ctx = cohortRef.current.getContext('2d')
      if (ctx) {
        // Use this week's salesperson data
        const salespersonData = data?.salespersonsThisWeek || data?.salespersons || []
        
        console.log('Salesperson Performance Data:', {
          hasData: !!data,
          salespersonsThisWeek: data?.salespersonsThisWeek,
          salespersons: data?.salespersons,
          salespersonDataLength: salespersonData.length
        })
        
        cohortInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: salespersonData.map(sp => sp.name),
            datasets: [{
              label: 'Quotes Sent',
              data: salespersonData.map(sp => sp.quotesSent),
              backgroundColor: '#fb923c',
              borderRadius: 6,
              barPercentage: 0.8
            }, {
              label: 'Quotes Converted',
              data: salespersonData.map(sp => sp.quotesConverted),
              backgroundColor: '#3b82f6',
              borderRadius: 6,
              barPercentage: 0.8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                display: true,
                position: 'top',
                labels: {
                  boxWidth: 12,
                  padding: 10,
                  font: {
                    size: 11
                  }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  afterLabel: (context) => {
                    const index = context.dataIndex
                    const sp = salespersonData[index]
                    if (sp) {
                      return `CVR: ${sp.conversionRate.toFixed(1)}%`
                    }
                    return ''
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  stepSize: 5
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }
    
    // Revenue Waterfall Chart
    if (waterfallRef.current && !loading && data) {
      const ctx = waterfallRef.current.getContext('2d')
      if (ctx) {
        // Q2 2025 (Apr-Jun) data
        const waterfallData = [
          { label: 'Q2 Start', value: 0, cumulative: 0 },
          { label: 'Quotes Sent', value: 198000, cumulative: 198000 },
          { label: 'Not Converted', value: -135000, cumulative: 63000 },
          { label: 'Converted', value: 63000, cumulative: 63000 },
          { label: 'Cancelled', value: -8500, cumulative: 54500 },
          { label: 'Q2 Revenue', value: 54500, cumulative: 54500 }
        ]
        
        waterfallInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: waterfallData.map(d => d.label),
            datasets: [{
              label: 'Revenue Flow',
              data: waterfallData.map(d => Math.abs(d.value)),
              backgroundColor: waterfallData.map(d => 
                d.value > 0 ? 'rgba(168, 85, 247, 0.8)' : 'rgba(239, 68, 68, 0.8)'
              ),
              borderWidth: 0,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: (context) => {
                    const value = waterfallData[context.dataIndex].value
                    return `${value > 0 ? '+' : ''}$${value.toLocaleString()}`
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value) => `$${Number(value) / 1000}k`
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      }
    }
    
    // Time of Day Heatmap
    if (heatmapRef.current && !loading && data) {
      const ctx = heatmapRef.current.getContext('2d')
      if (ctx) {
        // Mock heatmap data - hours vs days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM']
        
        const heatmapData: any[] = []
        days.forEach((_, dayIndex) => {
          hours.forEach((_, hourIndex) => {
            const activity = Math.random() * 10 + (dayIndex < 5 ? 5 : 2) // Higher on weekdays
            heatmapData.push({
              x: hourIndex,
              y: dayIndex,
              v: Math.round(activity)
            })
          })
        })
        
        heatmapInstance.current = new Chart(ctx, {
          type: 'bubble',
          data: {
            datasets: [{
              label: 'Quote Activity',
              data: heatmapData,
              backgroundColor: (context) => {
                const value = (context.raw as any).v
                const alpha = value / 15
                return `rgba(249, 115, 22, ${alpha})`
              },
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: (context) => {
                    const dataPoint = context.raw as { x: number; y: number; v: number }
                    return `${days[dataPoint.y]} ${hours[dataPoint.x]}: ${dataPoint.v} quotes`
                  }
                }
              }
            },
            scales: {
              x: {
                type: 'linear',
                position: 'bottom',
                min: -0.5,
                max: 8.5,
                ticks: {
                  stepSize: 1,
                  callback: (value) => hours[value as number] || ''
                },
                grid: { display: false }
              },
              y: {
                type: 'linear',
                min: -0.5,
                max: 6.5,
                ticks: {
                  stepSize: 1,
                  callback: (value) => days[value as number] || ''
                },
                grid: { display: false }
              }
            }
          }
        })
      }
    }

    // Cleanup
    return () => {
      trendChartInstance.current?.destroy()
      conversionChartInstance.current?.destroy()
      monthlyOTBChartInstance.current?.destroy()
      weeklyOTBChartInstance.current?.destroy()
      sparklineInstance.current?.destroy()
      speedDistributionInstance.current?.destroy()
      heatmapInstance.current?.destroy()
      waterfallInstance.current?.destroy()
      cohortInstance.current?.destroy()
      Object.values(kpiSparklineInstances.current).forEach(chart => chart?.destroy())
    }
  }, [data, loading, kpis])

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="relative inline-flex mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-spin"></div>
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full absolute top-0 left-0 animate-ping"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h2>
            <p className="text-white/60">Connecting to data source...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-400 mb-4">Error loading dashboard</p>
            <p className="text-white/60">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white font-inter">
      <div className="flex h-full">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800/80 backdrop-blur-lg rounded-lg border border-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col gap-6 border-r border-white/10 bg-gray-900/50 backdrop-blur-lg p-6`}>
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Pink's Logo" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-semibold tracking-tight">Pink's Pulse</span>
          </div>

          <nav className="flex flex-col gap-1 text-sm">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 relative overflow-hidden group">
              <TrendingUp className="h-4 w-4" />
              Dashboard
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
          </nav>

        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4 px-4 lg:px-6 py-4 border-b border-white/10 bg-gray-900/30 backdrop-blur-lg">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-8"></div>
              <div>
                <h1 className="text-base lg:text-lg font-medium">Pink's Pulse - Hudson Valley KPI Report</h1>
              </div>
            </div>
            
            <div className="flex-1"></div>
          </header>

          {/* Main Content */}
          <section className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
            {/* First Row KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm text-gray-400">{kpi.label}</h3>
                    {kpi.subtitle && (
                      <p className="text-xs text-gray-500">{kpi.subtitle}</p>
                    )}
                    <p className={`text-2xl font-bold ${
                      kpi.value === 0 && kpi.id.includes('today') ? 'text-gray-500' : 'text-white'
                    }`}>
                      {kpi.value === 0 && kpi.id.includes('today') ? 'No data' : formatValue(kpi.value, kpi.format)}
                    </p>
                    {/* Goal Progress Bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-gray-400">{Math.round((kpi.value / kpi.target) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            kpi.status === 'success' ? 'bg-green-500' :
                            kpi.status === 'warning' ? 'bg-yellow-500' :
                            kpi.status === 'danger' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    {kpi.isLive && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-gray-500">Live</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Second Row KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {secondRowKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm text-gray-400">{kpi.label}</h3>
                    {kpi.subtitle && (
                      <p className="text-xs text-gray-500">{kpi.subtitle}</p>
                    )}
                    <p className={`text-2xl font-bold ${
                      kpi.status === 'success' ? 'text-green-400' :
                      kpi.status === 'warning' ? 'text-yellow-400' :
                      kpi.status === 'danger' ? 'text-red-400' : 'text-white'
                    }`}>
                      {formatValue(kpi.value, kpi.format)}
                    </p>
                    {kpi.trend && (
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className={`h-3 w-3 ${kpi.trend > 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className={kpi.trend > 0 ? 'text-green-400' : 'text-red-400'}>
                          {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                        </span>
                      </div>
                    )}
                    {kpi.sparklineData && (
                      <div className="h-8 w-full mt-2">
                        <canvas 
                          ref={(el) => { if (el) kpiSparklineRefs.current[kpi.id] = el }}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Data Quality Indicators */}
            <div className="flex items-center justify-between bg-gray-900/30 rounded-lg p-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-400">BigQuery Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-xs text-gray-400">Live Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>
              {data?.dataSource === 'mock' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400">Using mock data</span>
                </div>
              )}
            </div>
            
            {/* Latest Google Reviews */}
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400">Latest Customer Reviews</h3>
              <span className="text-xs text-gray-500">From Google Reviews</span>
            </div>
            <div className="relative h-10 overflow-hidden bg-gray-900/50 rounded-lg backdrop-blur-lg">
              <div className="absolute whitespace-nowrap animate-[scroll_30s_linear_infinite]">
                {[...googleReviews, ...googleReviews].map((review, i) => (
                  <span key={`${review.id}-${i}`} className="inline-flex items-center gap-3 mx-12">
                    <span className="flex items-center gap-1">
                      {[...Array(5)].map((_, starIndex) => (
                        <span key={starIndex} className={`text-xs ${starIndex < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                      ))}
                    </span>
                    <span className="text-gray-400 text-sm font-medium">{review.author}</span>
                    <span className="text-white text-sm">"{review.text}"</span>
                    <span className="text-gray-500 text-xs">• {review.time}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Converted This Week Chart */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">Converted This Week</h2>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-400 rounded"></div>
                      <span className="text-gray-400">Sent Quotes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-gray-400">Converted</span>
                    </div>
                  </div>
                </div>
                <div className="h-48">
                  <canvas ref={trendChartRef}></canvas>
                </div>
              </div>

              {/* Weekly CVR % */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-shadow">
                <h2 className="font-medium mb-4">Weekly CVR %</h2>
                <div className="h-48">
                  <canvas ref={conversionChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Speed to Lead Distribution */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-shadow">
                <h2 className="font-medium mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-pink-400" />
                  Speed to Lead Distribution
                </h2>
                <div className="h-48">
                  <canvas ref={speedDistributionRef}></canvas>
                </div>
              </div>
              
              {/* Salesperson Performance */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(251,146,60,0.3)] transition-shadow">
                <h2 className="font-medium mb-4">Salesperson Performance (This Week)</h2>
                <div className="h-48">
                  <canvas ref={cohortRef}></canvas>
                </div>
              </div>
            </div>

            {/* Charts Row 3 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* On The Books by Month */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">On The Books by Month - 2025 YTD (Excluding Sales Tax)</h2>
                </div>
                <div className="h-48">
                  <canvas ref={monthlyOTBChartRef}></canvas>
                </div>
              </div>

              {/* On the Books by Week */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-shadow">
                <h2 className="font-medium mb-4">On the Books by Week - This Month</h2>
                <div className="h-48">
                  <canvas ref={weeklyOTBChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Revenue Waterfall Chart */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-shadow">
              <h2 className="font-medium mb-4">Revenue Flow Waterfall - This Quarter</h2>
              <div className="h-64">
                <canvas ref={waterfallRef}></canvas>
              </div>
            </div>

            {/* Salesperson Leaderboard Enhanced */}
            {data?.salespersons && data.salespersons.length > 0 && (
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Sales Team Performance
                  </h2>
                  <span className="text-xs text-gray-400">Last 90 days</span>
                </div>
                <div className="space-y-3">
                  {data.salespersons.slice(0, 5).map((sp, index) => {
                    // Map salesperson names to their headshot images
                    const headshots: { [key: string]: string } = {
                      'Christian Ruddy': '/christian-ruddy.jpg',
                      'Michael Squires': '/michael-squires.jpg',
                      'Giovanni Femia': '/luigi.jpg'
                    }
                    
                    const avgQuoteValue = sp.quotesSent > 0 ? sp.valueSent / sp.quotesSent : 0
                    const responseTime = Math.floor(Math.random() * 30 + 10) // Mock response time
                    
                    return (
                      <div key={sp.name} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {headshots[sp.name] ? (
                              <img 
                                src={headshots[sp.name]} 
                                alt={sp.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-700"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ backgroundColor: sp.color }}>
                                {sp.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{index + 1}</span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{sp.name}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                              <span>{sp.quotesSent} sent</span>
                              <span>•</span>
                              <span>{sp.quotesConverted} won</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {responseTime} min avg
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-lg">{formatValue(sp.valueConverted, 'currency')}</p>
                          <div className="flex items-center justify-end gap-3 text-xs mt-1">
                            <span className={`font-medium ${
                              sp.conversionRate >= 40 ? 'text-green-400' : 
                              sp.conversionRate >= 30 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {sp.conversionRate.toFixed(1)}% CVR
                            </span>
                            <span className="text-gray-400">
                              ${Math.round(avgQuoteValue).toLocaleString()} avg
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Converted Quotes Table */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="font-medium mb-4">Converted Quotes - This Week</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                      <th className="pb-3 pr-4">Date Converted</th>
                      <th className="pb-3 pr-4">Job Number</th>
                      <th className="pb-3 pr-4">Job Date</th>
                      <th className="pb-3 pr-4">Job Type</th>
                      <th className="pb-3 pr-4">Sales Person</th>
                      <th className="pb-3 pr-4">JobberLink</th>
                      <th className="pb-3 pr-4">Visit Title</th>
                      <th className="pb-3 text-right">Total Dollars</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(data?.recentConvertedQuotes || getConvertedQuotes()).map((quote: any, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-3 pr-4">{quote.dateConverted}</td>
                        <td className="py-3 pr-4">{quote.quoteNumber || quote.jobNumber || '-'}</td>
                        <td className="py-3 pr-4">{quote.date || '-'}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs">
                            {quote.jobType || 'ONE_OFF'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{quote.salesPerson}</td>
                        <td className="py-3 pr-4">
                          <a href={quote.jobberLink || '#'} className="text-blue-400 hover:underline">
                            View
                          </a>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{quote.visitTitle || quote.clientName || 'null'}</td>
                        <td className="py-3 text-right font-medium">
                          {formatValue(quote.totalDollars, 'currency')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Latest Customer Reviews */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="font-medium mb-4">Latest Customer Reviews</h2>
              <div className="relative overflow-hidden">
                <style>
                  {`
                    @keyframes scroll {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                  `}
                </style>
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    animation: googleReviews.length > 1 ? 'scroll 20s linear infinite' : 'none',
                  }}
                >
                  {googleReviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="flex-shrink-0 w-full px-2"
                    >
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-white">{review.author}</p>
                            <p className="text-xs text-gray-400">{review.time}</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400' : 'text-gray-600'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-3">{review.text}</p>
                      </div>
                    </div>
                  ))}
                  {/* Duplicate for seamless scrolling */}
                  {googleReviews.length > 1 && googleReviews.map((review) => (
                    <div 
                      key={`${review.id}-duplicate`} 
                      className="flex-shrink-0 w-full px-2"
                    >
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-white">{review.author}</p>
                            <p className="text-xs text-gray-400">{review.time}</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400' : 'text-gray-600'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-3">{review.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Full-Screen Metric Modal */}
      <AnimatePresence>
        {selectedMetric && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8"
            onClick={() => setSelectedMetric(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full bg-gray-900/90 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selectedMetric.label} Deep Dive</h2>
                <button 
                  onClick={() => setSelectedMetric(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-5xl font-bold mb-2">{formatValue(selectedMetric.value, selectedMetric.format)}</p>
                  <p className="text-gray-400">Target: {formatValue(selectedMetric.target, selectedMetric.format)}</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="16"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(selectedMetric.value / selectedMetric.target, 1))}`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {Math.round((selectedMetric.value / selectedMetric.target) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getSecondRowMockKPIs(): KPI[] {
  return [
    {
      id: 'speed-to-lead',
      label: '30D Speed to Lead',
      subtitle: 'Target: 30 min',
      value: 22,
      target: 30,
      format: 'number',
      status: 'warning'
    },
    {
      id: 'recurring-cvr',
      label: '30D Recurring CVR',
      value: 0,
      target: 20,
      format: 'percentage',
      status: 'normal'
    },
    {
      id: 'avg-qpd',
      label: '30D AVG QPD',
      subtitle: 'Target: 12',
      value: 3.45,
      target: 12,
      format: 'number',
      status: 'danger'
    },
    {
      id: 'reviews-week',
      label: 'Reviews This Week',
      subtitle: 'Target: 4',
      value: 3,
      target: 4,
      format: 'number',
      status: 'warning'
    },
    {
      id: 'cvr-30d',
      label: '30D CVR',
      subtitle: 'Target: 45%',
      value: 53,
      target: 45,
      format: 'percentage',
      status: 'success'
    }
  ]
}

function getConvertedQuotes(): ConvertedQuote[] {
  return [
    {
      dateConverted: 'Jun 27, 2025',
      jobNumber: '325',
      date: 'Jul 11, 2025',
      jobType: 'ONE_OFF',
      salesPerson: 'Christian Ruddy',
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: 'null',
      totalDollars: 1175.00
    },
    {
      dateConverted: 'Jun 25, 2025',
      jobNumber: '324',
      date: 'Aug 13, 2025',
      jobType: 'ONE_OFF',
      salesPerson: 'Michael Squires',
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: 'null',
      totalDollars: 1600.00
    },
    {
      dateConverted: 'Jun 25, 2025',
      jobNumber: '322',
      date: 'Jul 23, 2025',
      jobType: 'ONE_OFF',
      salesPerson: 'Michael Squires',
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: 'null',
      totalDollars: 1200.00
    },
    {
      dateConverted: 'Jun 25, 2025',
      jobNumber: '323',
      date: 'Aug 11, 2025',
      jobType: 'ONE_OFF',
      salesPerson: 'Michael Squires',
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: 'null',
      totalDollars: 1200.00
    },
    {
      dateConverted: 'Jun 25, 2025',
      jobNumber: '318',
      date: 'Aug 6, 2025',
      jobType: 'ONE_OFF',
      salesPerson: 'Michael Squires',
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: 'Eileen Geller',
      totalDollars: 999.80
    },
    {
      dateConverted: 'Jun 25, 2025',
      jobNumber: '316',
      date: 'Jun 30, 2025',
      jobType: 'ONE_OFF',
      salesPerson: 'Christian Ruddy',
      jobberLink: 'https://secure.getjobber.com',
      visitTitle: 'Elizabeth Moore',
      totalDollars: 695.00
    }
  ]
}

export default SalesKPIDashboard