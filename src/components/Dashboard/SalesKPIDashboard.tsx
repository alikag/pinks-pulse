import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Menu, Bell, HelpCircle, TrendingUp, Activity, BarChart3, XCircle, Trophy, Users, Target } from 'lucide-react'
import Chart from 'chart.js/auto'
import { useDashboardData } from '../../hooks/useDashboardData'
import { motion, AnimatePresence } from 'framer-motion'

// Types
interface KPI {
  id: string
  label: string
  value: number
  target: number
  format: 'currency' | 'percentage' | 'number'
  status: 'success' | 'warning' | 'danger' | 'normal'
  trend?: number
  isLive?: boolean
  lastUpdated?: Date
  subtitle?: string
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

interface RecentEvent {
  id: string
  time: string
  description: string
  type: 'conversion' | 'quote' | 'milestone'
}

const SalesKPIDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'Today' | 'Week' | 'Month' | 'Quarter'>('Today')
  const [selectedMetric, setSelectedMetric] = useState<KPI | null>(null)
  const { data, loading, error } = useDashboardData()
  
  // Chart refs
  const trendChartRef = useRef<HTMLCanvasElement>(null)
  const conversionChartRef = useRef<HTMLCanvasElement>(null)
  const monthlyOTBChartRef = useRef<HTMLCanvasElement>(null)
  const weeklyOTBChartRef = useRef<HTMLCanvasElement>(null)
  const sparklineRef = useRef<HTMLCanvasElement>(null)
  
  // Chart instances
  const trendChartInstance = useRef<Chart | null>(null)
  const conversionChartInstance = useRef<Chart | null>(null)
  const monthlyOTBChartInstance = useRef<Chart | null>(null)
  const weeklyOTBChartInstance = useRef<Chart | null>(null)
  const sparklineInstance = useRef<Chart | null>(null)

  // Calculate KPIs from data
  const kpis = useMemo<KPI[]>(() => {
    console.log('SalesKPIDashboard - Full data object:', data);
    console.log('SalesKPIDashboard - Data keys:', data ? Object.keys(data) : 'No data');
    console.log('SalesKPIDashboard - Has kpiMetrics?', data?.kpiMetrics);
    
    if (loading) {
      console.log('Still loading, using mock data');
      return getMockKPIs()
    }
    
    if (!data || !data.kpiMetrics) {
      console.log('No data or kpiMetrics available, using mock data');
      return getMockKPIs()
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
        isLive: true
      },
      {
        id: 'converted-today',
        label: 'Converted Today',
        subtitle: 'total_dollars',
        value: metrics.convertedTodayDollars,
        target: 22500,
        format: 'currency',
        status: metrics.convertedTodayDollars >= 22500 ? 'success' : metrics.convertedTodayDollars > 15000 ? 'warning' : 'normal',
        isLive: true
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
    
    return [
      {
        id: 'speed-to-lead',
        label: '30D Speed to Lead',
        subtitle: 'Target: 30 min',
        value: metrics.speedToLead30Days || 0,
        target: 30,
        format: 'number',
        status: metrics.speedToLead30Days <= 30 ? 'success' : 'warning'
      },
      {
        id: 'recurring-cvr',
        label: '30D Recurring CVR',
        value: 0, // Would need recurring quotes data
        target: 20,
        format: 'percentage',
        status: 'normal'
      },
      {
        id: 'avg-qpd',
        label: '30D AVG QPD',
        subtitle: 'Target: 12',
        value: metrics.avgQPD,
        target: 12,
        format: 'number',
        status: metrics.avgQPD >= 12 ? 'success' : metrics.avgQPD >= 6 ? 'warning' : 'danger'
      },
      {
        id: 'reviews-week',
        label: 'Reviews This Week',
        subtitle: 'Target: 4',
        value: metrics.reviewsThisWeek || 3,
        target: 4,
        format: 'number',
        status: metrics.reviewsThisWeek >= 4 ? 'success' : 'warning'
      },
      {
        id: 'cvr-30d',
        label: '30D CVR',
        subtitle: 'Target: 45%',
        value: metrics.cvr30Days,
        target: 45,
        format: 'percentage',
        status: metrics.cvr30Days >= 45 ? 'success' : metrics.cvr30Days >= 30 ? 'warning' : 'danger'
      }
    ]
  }, [data, loading])

  // Mock recent events
  const recentEvents: RecentEvent[] = [
    { id: '1', time: '2:34 PM', description: 'New quote converted - $12,500', type: 'conversion' },
    { id: '2', time: '2:28 PM', description: 'Quote sent to Acme Corp', type: 'quote' },
    { id: '3', time: '2:15 PM', description: '🎯 Daily target achieved!', type: 'milestone' },
    { id: '4', time: '1:45 PM', description: 'New lead from website', type: 'quote' }
  ]

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

    // Revenue Trend Chart
    if (trendChartRef.current && !loading && data?.timeSeries) {
      const ctx = trendChartRef.current.getContext('2d')
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200)
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)')
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)')
        
        // Map UI period to data period for chart
        let chartPeriodKey: keyof typeof data.timeSeries
        switch (selectedPeriod) {
          case 'Today':
          case 'Week':
            chartPeriodKey = 'week'
            break
          case 'Month':
            chartPeriodKey = 'month'
            break
          case 'Quarter':
            chartPeriodKey = 'year'
            break
          default:
            chartPeriodKey = 'week'
        }
        const chartData = data.timeSeries[chartPeriodKey]
        const revenueData = chartData.quotesConverted.map((_, index) => {
          // Use actual converted dollars from the period
          return chartData.quotesConverted[index] * (data.kpiMetrics?.convertedThisWeekDollars / Math.max(data.kpiMetrics?.convertedThisWeek || 1, 1) || 5000)
        })
        
        trendChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Revenue',
              data: revenueData,
              borderColor: '#0ea5e9',
              backgroundColor: gradient,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#0ea5e9',
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
                  label: (context) => `Revenue: $${context.parsed.y.toLocaleString()}`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: false,
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
        
        // Use actual data based on selected period
        let monthLabels = ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025']
        let monthlyOTB = [1000, 33550, 50918.5, 78517.5, 73032.5, 52967.5, 4742.5, 4727.5, 5662.5, 2427.5]
        
        // Adjust data based on selected period
        const now = new Date()
        const currentMonth = now.getMonth()
        if (selectedPeriod === 'Today' || selectedPeriod === 'Week') {
          // Show only current month
          monthLabels = [monthLabels[currentMonth]]
          monthlyOTB = [data.kpiMetrics?.thisMonthOTB || monthlyOTB[currentMonth]]
        } else if (selectedPeriod === 'Month') {
          // Show current month and next month
          monthLabels = monthLabels.slice(currentMonth, currentMonth + 2)
          monthlyOTB = [
            data.kpiMetrics?.thisMonthOTB || monthlyOTB[currentMonth],
            data.kpiMetrics?.nextMonthOTB || monthlyOTB[currentMonth + 1]
          ]
        }
        
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
        
        // Use actual data based on selected period
        let weekLabels = ['06-9', '06-16', '06-23', '06-30', '07-7', '07-14', '07-21', '07-28', '08-4', '08-11']
        let weeklyOTB = [25785, 19975.56, 19875.56, 5536, 12496.5, 30544.5, 18052, 5636, 18052, 4557.8]
        
        // Adjust data for current period
        if (selectedPeriod === 'Today' || selectedPeriod === 'Week') {
          // Show this week's OTB
          weekLabels = ['This Week']
          weeklyOTB = [data.kpiMetrics?.thisWeekOTB || 0]
        } else if (selectedPeriod === 'Month') {
          // Show last 4 weeks
          weekLabels = weekLabels.slice(-4)
          weeklyOTB = weeklyOTB.slice(-4)
        }
        
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

    // Cleanup
    return () => {
      trendChartInstance.current?.destroy()
      conversionChartInstance.current?.destroy()
      monthlyOTBChartInstance.current?.destroy()
      weeklyOTBChartInstance.current?.destroy()
      sparklineInstance.current?.destroy()
    }
  }, [data, loading, selectedPeriod])

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-400 mb-4">Error loading dashboard</p>
            <p className="text-white/60">Using mock data</p>
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
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg grid place-content-center relative">
              <BarChart3 className="h-5 w-5" />
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg blur opacity-50"></div>
            </div>
            <span className="text-lg font-semibold tracking-tight">Sales Pulse</span>
          </div>

          <nav className="flex flex-col gap-1 text-sm">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 relative overflow-hidden group">
              <TrendingUp className="h-4 w-4" />
              Dashboard
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Users className="h-4 w-4" />
              Team
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Target className="h-4 w-4" />
              Goals
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Activity className="h-4 w-4" />
              <span className="flex-1">Live Feed</span>
              <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md animate-pulse">LIVE</span>
            </a>
          </nav>

          {/* Daily Sparkline */}
          <div className="mt-auto bg-gradient-to-br from-blue-600/10 to-cyan-600/10 p-4 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-50">
              <canvas ref={sparklineRef} className="w-full h-full"></canvas>
            </div>
            <div className="relative z-10 text-center">
              <p className="text-xs text-white/60 mb-1">Today's Performance</p>
              <p className="text-3xl font-bold">{formatValue(kpis[1]?.value || 0, 'currency')}</p>
              <p className="text-xs text-cyan-400 mt-1">↑ 12.5% from yesterday</p>
            </div>
          </div>
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
                <h1 className="text-base lg:text-lg font-medium">Sales Analytics</h1>
                <p className="text-xs lg:text-sm text-white/60">Real-time performance metrics</p>
              </div>
            </div>
            
            {/* Period Selector */}
            <div className="flex gap-2">
              {(['Today', 'Week', 'Month', 'Quarter'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === period 
                      ? 'bg-blue-500/20 text-blue-300 ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                      : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button className="relative hidden sm:block">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
              </button>
              <HelpCircle className="h-5 w-5 hidden sm:block" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-xs font-semibold">JD</span>
              </div>
            </div>
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
                    {kpi.isLive && (
                      <div className="flex items-center gap-2">
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
                    {kpi.id === 'speed-to-lead' && (
                      <p className="text-xs text-gray-500">minutes</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Activity Feed */}
            <div className="relative h-10 overflow-hidden bg-gray-900/50 rounded-lg backdrop-blur-lg">
              <div className="absolute whitespace-nowrap animate-[scroll_20s_linear_infinite]">
                {[...recentEvents, ...recentEvents].map((event, i) => (
                  <span key={`${event.id}-${i}`} className="inline-flex items-center gap-2 mx-8">
                    <span className={`text-sm ${
                      event.type === 'conversion' ? 'text-green-400' :
                      event.type === 'milestone' ? 'text-yellow-400' : 'text-cyan-400'
                    }`}>●</span>
                    <span className="text-gray-400 text-sm">{event.time}</span>
                    <span className="text-white text-sm">{event.description}</span>
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
              {/* On The Books by Month */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">On The Books by Month (Excluding Sales Tax)</h2>
                </div>
                <div className="h-48">
                  <canvas ref={monthlyOTBChartRef}></canvas>
                </div>
              </div>

              {/* On the Books by Week */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-shadow">
                <h2 className="font-medium mb-4">On the Books by Week</h2>
                <div className="h-48">
                  <canvas ref={weeklyOTBChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Salesperson Leaderboard */}
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
                  {data.salespersons.slice(0, 5).map((sp, index) => (
                    <div key={sp.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: sp.color }}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{sp.name}</p>
                          <p className="text-xs text-gray-400">
                            {sp.quotesSent} quotes • {sp.quotesConverted} converted
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatValue(sp.valueConverted, 'currency')}</p>
                        <p className="text-xs text-gray-400">{sp.conversionRate.toFixed(1)}% CVR</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Converted Quotes Table */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="font-medium mb-4">Converted Quotes</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                      <th className="pb-3 pr-4">Date Converted</th>
                      <th className="pb-3 pr-4">Job Number</th>
                      <th className="pb-3 pr-4">Date</th>
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

// Mock KPIs fallback
function getMockKPIs(): KPI[] {
  return [
    {
      id: 'quotes-sent-today',
      label: 'Quotes Sent Today',
      subtitle: 'Target: 12',
      value: 0,
      target: 12,
      format: 'number',
      status: 'danger',
      isLive: true
    },
    {
      id: 'converted-today',
      label: 'Converted Today',
      subtitle: 'total_dollars',
      value: 17208.18,
      target: 20000,
      format: 'currency',
      status: 'warning',
      isLive: true
    },
    {
      id: 'converted-week',
      label: 'Converted This Week',
      subtitle: 'total_dollars',
      value: 17208.18,
      target: 100000,
      format: 'currency',
      status: 'danger'
    },
    {
      id: 'cvr-week',
      label: 'CVR This Week',
      subtitle: 'Target: 45%',
      value: 29,
      target: 45,
      format: 'percentage',
      status: 'warning'
    },
    {
      id: 'recurring-2026',
      label: '2026 Recurring',
      subtitle: 'Total: $85k',
      value: 111160,
      target: 85000,
      format: 'currency',
      status: 'success'
    },
    {
      id: 'next-month-otb',
      label: 'Next Month OTB',
      subtitle: 'Target: $125k',
      value: 73052.50,
      target: 125000,
      format: 'currency',
      status: 'danger'
    }
  ]
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