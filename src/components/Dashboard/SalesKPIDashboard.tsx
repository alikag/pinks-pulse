import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Menu, Bell, HelpCircle, TrendingUp, Activity, Users, Target, Zap, BarChart3, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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
  trend: number
  isLive?: boolean
  lastUpdated?: Date
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
  const performanceChartRef = useRef<HTMLCanvasElement>(null)
  const sparklineRef = useRef<HTMLCanvasElement>(null)
  
  // Chart instances
  const trendChartInstance = useRef<Chart | null>(null)
  const conversionChartInstance = useRef<Chart | null>(null)
  const performanceChartInstance = useRef<Chart | null>(null)
  const sparklineInstance = useRef<Chart | null>(null)

  // Calculate KPIs from data
  const kpis = useMemo<KPI[]>(() => {
    if (!data || !data.timeSeries) {
      console.log('No data or timeSeries available, using mock data');
      return getMockKPIs()
    }
    
    // Map UI period to data period
    let periodKey: keyof typeof data.timeSeries
    switch (selectedPeriod) {
      case 'Today':
        periodKey = 'week' // Use week data for today view
        break
      case 'Week':
        periodKey = 'week'
        break
      case 'Month':
        periodKey = 'month'
        break
      case 'Quarter':
        periodKey = 'year' // Use year data for quarter view
        break
      default:
        periodKey = 'week'
    }
    
    const timeData = data.timeSeries[periodKey]
    
    const totalRevenue = timeData.quotesConverted.reduce((sum, val) => sum + val * 5000, 0)
    const totalQuotes = timeData.quotesSent.reduce((sum, val) => sum + val, 0)
    const totalConversions = timeData.quotesConverted.reduce((sum, val) => sum + val, 0)
    const conversionRate = totalQuotes > 0 ? (totalConversions / totalQuotes) * 100 : 0
    
    return [
      {
        id: 'revenue',
        label: 'Total Revenue',
        value: totalRevenue,
        target: totalRevenue * 1.15,
        format: 'currency',
        status: totalRevenue > totalRevenue * 0.9 ? 'success' : 'warning',
        trend: 12.5,
        isLive: true
      },
      {
        id: 'conversion',
        label: 'Conversion Rate',
        value: conversionRate,
        target: 25,
        format: 'percentage',
        status: conversionRate > 20 ? 'success' : conversionRate > 15 ? 'warning' : 'danger',
        trend: -2.3,
        isLive: true
      },
      {
        id: 'quotes',
        label: 'Quotes Sent',
        value: totalQuotes,
        target: Math.ceil(totalQuotes * 1.1),
        format: 'number',
        status: 'normal',
        trend: 8.7,
        isLive: false
      },
      {
        id: 'avg-deal',
        label: 'Avg Deal Size',
        value: totalConversions > 0 ? totalRevenue / totalConversions : 0,
        target: 5500,
        format: 'currency',
        status: 'success',
        trend: 5.2,
        isLive: false
      }
    ]
  }, [data, selectedPeriod])

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

  const getStatusColor = (status: KPI['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'danger': return 'bg-red-500'
      default: return 'bg-blue-500'
    }
  }

  const getGradientColor = (status: KPI['status']) => {
    switch (status) {
      case 'success': return 'from-green-500/20 to-green-500/5'
      case 'warning': return 'from-yellow-500/20 to-yellow-500/5'
      case 'danger': return 'from-red-500/20 to-red-500/5'
      default: return 'from-blue-500/20 to-blue-500/5'
    }
  }

  const getProgressColor = (status: KPI['status']) => {
    switch (status) {
      case 'success': return 'bg-gradient-to-r from-green-500 to-green-400'
      case 'warning': return 'bg-gradient-to-r from-yellow-500 to-yellow-400'
      case 'danger': return 'bg-gradient-to-r from-red-500 to-red-400'
      default: return 'bg-gradient-to-r from-blue-500 to-blue-400'
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
    if (performanceChartInstance.current) performanceChartInstance.current.destroy()
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
    if (trendChartRef.current && data?.timeSeries) {
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
        const revenueData = chartData.quotesConverted.map(val => val * 5000) // Assuming $5000 per conversion
        
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

    // Conversion Funnel Chart
    if (conversionChartRef.current && data?.timeSeries) {
      const ctx = conversionChartRef.current.getContext('2d')
      if (ctx) {
        // Calculate funnel data from current period
        let funnelPeriodKey: keyof typeof data.timeSeries
        switch (selectedPeriod) {
          case 'Today':
          case 'Week':
            funnelPeriodKey = 'week'
            break
          case 'Month':
            funnelPeriodKey = 'month'
            break
          case 'Quarter':
            funnelPeriodKey = 'year'
            break
          default:
            funnelPeriodKey = 'week'
        }
        const periodData = data.timeSeries[funnelPeriodKey]
        const totalSent = periodData.totalSent
        const totalConverted = periodData.totalConverted
        
        // Estimate funnel stages (you can adjust these ratios based on your business)
        const funnelData = [
          totalSent * 1.5,  // Leads (assume 1.5x quotes were leads)
          totalSent * 1.2,  // Contacted
          totalSent,        // Quoted
          totalSent * 0.6,  // Negotiated
          totalConverted    // Closed
        ]
        
        conversionChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Leads', 'Contacted', 'Quoted', 'Negotiated', 'Closed'],
            datasets: [{
              data: funnelData,
              backgroundColor: [
                'rgba(99, 102, 241, 0.8)',
                'rgba(59, 130, 246, 0.8)',
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

    // Salesperson Performance Chart
    if (performanceChartRef.current) {
      const ctx = performanceChartRef.current.getContext('2d')
      if (ctx) {
        performanceChartInstance.current = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Quotes', 'Conversions', 'Revenue', 'Avg Deal', 'Speed'],
            datasets: [
              {
                label: 'Current',
                data: [85, 72, 90, 78, 65],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
              },
              {
                label: 'Target',
                data: [90, 80, 85, 85, 80],
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { padding: 20, usePointStyle: true }
              }
            },
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { display: false }
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
      performanceChartInstance.current?.destroy()
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
              <p className="text-3xl font-bold">{formatValue(kpis[0]?.value || 0, 'currency')}</p>
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
            {/* KPI Cards with Live Updates */}
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <motion.div
                  key={kpi.id}
                  className="group relative bg-gray-800/50 backdrop-blur-lg rounded-lg p-4 hover:bg-gray-700/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => setSelectedMetric(kpi)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-r ${getGradientColor(kpi.status)} transition-opacity duration-300`} />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Pulsing status indicator */}
                      <div className={`w-2 h-2 rounded-full ${kpi.isLive ? 'animate-pulse' : ''} ${getStatusColor(kpi.status)}`} />
                      <span className="text-gray-300">{kpi.label}</span>
                      {kpi.trend !== 0 && (
                        <span className={`text-xs ${kpi.trend > 0 ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
                          {kpi.trend > 0 ? '↑' : '↓'} {Math.abs(kpi.trend)}%
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-white">
                        {formatValue(kpi.value, kpi.format)}
                      </span>
                      <span className="text-sm text-gray-500">
                        / {formatValue(kpi.target, kpi.format)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Mini progress bar */}
                  <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${getProgressColor(kpi.status)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
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

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Revenue Trend Chart */}
              <div className="lg:col-span-2 bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">Revenue Trend</h2>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-gray-400">Live data</span>
                  </div>
                </div>
                <div className="h-48">
                  <canvas ref={trendChartRef}></canvas>
                </div>
              </div>

              {/* Performance Radar */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-shadow">
                <h2 className="font-medium mb-4">Performance Metrics</h2>
                <div className="h-48">
                  <canvas ref={performanceChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium">Conversion Funnel</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-gray-400">28 closed</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <span className="text-gray-400">45 in progress</span>
                  </span>
                </div>
              </div>
              <div className="h-64">
                <canvas ref={conversionChartRef}></canvas>
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
      id: 'revenue',
      label: 'Total Revenue',
      value: 487500,
      target: 500000,
      format: 'currency',
      status: 'success',
      trend: 12.5,
      isLive: true
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: 22.8,
      target: 25,
      format: 'percentage',
      status: 'warning',
      trend: -2.3,
      isLive: true
    },
    {
      id: 'quotes',
      label: 'Quotes Sent',
      value: 156,
      target: 175,
      format: 'number',
      status: 'normal',
      trend: 8.7,
      isLive: false
    },
    {
      id: 'avg-deal',
      label: 'Avg Deal Size',
      value: 5250,
      target: 5500,
      format: 'currency',
      status: 'success',
      trend: 5.2,
      isLive: false
    }
  ]
}

export default SalesKPIDashboard