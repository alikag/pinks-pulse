import React, { useState, useMemo } from 'react'
import { Calendar, Download, Clock, Info, Star, XCircle, RefreshCw, Activity, Zap, Users, Truck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardData } from '../../hooks/useDashboardData'
import RainbowLoadingWave from '../RainbowLoadingWave'
import { haptics } from '../../utils/haptics'
import { getMobilePadding } from '../../utils/mobileOptimizations'

interface OperationalMetric {
  id: string
  label: string
  value: number
  icon: React.ReactNode
  format: 'number' | 'currency' | 'percentage' | 'time'
  color: string
  target?: number
  description?: string
}

const OperationalKPIs: React.FC = () => {
  const { data, loading, error, refetch, isRefreshing } = useDashboardData()
  const [selectedMetric, setSelectedMetric] = useState<OperationalMetric | null>(null)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Calculate operational metrics from the data
  const operationalMetrics = useMemo<OperationalMetric[]>(() => {
    if (!data) return []

    // Calculate revenue per van per day
    const totalVans = 6
    let revenuePerVanPerDay = 0
    
    if (data?.kpiMetrics?.convertedTodayDollars) {
      // Use today's revenue divided by number of vans
      revenuePerVanPerDay = data.kpiMetrics.convertedTodayDollars / totalVans
    }
    return [
      {
        id: 'revenue-per-van',
        label: 'Revenue per Van per Day',
        value: Math.round(revenuePerVanPerDay),
        icon: <Truck className="h-5 w-5 text-green-400" />,
        format: 'currency',
        color: 'green',
        target: 1500,
        description: 'Average daily revenue generated per van (6 vans total)'
      },
      {
        id: 'productivity-rate',
        label: 'Team Productivity Rate',
        value: 87.5,
        icon: <Activity className="h-5 w-5 text-blue-400" />,
        format: 'percentage',
        color: 'blue',
        target: 85,
        description: 'Average team productivity across all operations'
      },
      {
        id: 'job-completion-time',
        label: 'Avg Job Completion Time',
        value: 2.5,
        icon: <Clock className="h-5 w-5 text-green-400" />,
        format: 'time',
        color: 'green',
        target: 3,
        description: 'Average time to complete a job in hours'
      },
      {
        id: 'team-efficiency',
        label: 'Team Efficiency Score',
        value: 92,
        icon: <Zap className="h-5 w-5 text-yellow-400" />,
        format: 'number',
        color: 'yellow',
        target: 90,
        description: 'Overall team efficiency score (0-100)'
      },
      {
        id: 'customer-satisfaction',
        label: 'Customer Satisfaction',
        value: 4.8,
        icon: <Star className="h-5 w-5 text-pink-400" />,
        format: 'number',
        color: 'pink',
        target: 4.5,
        description: 'Average customer rating (out of 5)'
      },
      {
        id: 'crew-utilization',
        label: 'Crew Utilization Rate',
        value: 83,
        icon: <Users className="h-5 w-5 text-indigo-400" />,
        format: 'percentage',
        color: 'indigo',
        target: 85,
        description: 'Percentage of crew time spent on billable work'
      }
    ]
  }, [data])

  // Format value based on type
  const formatValue = (value: number, format: 'number' | 'currency' | 'percentage' | 'time'): string => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'time':
        return `${value.toFixed(1)}h`
      case 'number':
      default:
        return value.toLocaleString()
    }
  }

  // Get metric status color
  const getMetricStatus = (metric: OperationalMetric): string => {
    if (!metric.target) return 'text-gray-400'
    
    const percentageOfTarget = (metric.value / metric.target) * 100
    
    if (percentageOfTarget >= 100) return 'text-green-400'
    if (percentageOfTarget >= 90) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading || isRefreshing) {
    return <RainbowLoadingWave />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading operational data</p>
          <button 
            onClick={() => {
              haptics.medium()
              refetch()
            }}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-lg border-b border-white/10 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={getMobilePadding()}>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Operational KPIs</h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">Track operational efficiency and team performance</p>
          </div>
          
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-4">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => {
                  haptics.light()
                  setDateRange(e.target.value as any)
                }}
                className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={() => {
                haptics.medium()
                // TODO: Implement export functionality
                console.log('Export operational KPIs')
              }}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={() => {
                haptics.medium()
                refetch()
              }}
              disabled={loading && !data}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium
                ${(loading && !data)
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }
              `}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
          
          {/* Mobile Controls */}
          <div className="flex md:hidden flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {/* Date Range */}
              <select
                value={dateRange}
                onChange={(e) => {
                  haptics.light()
                  setDateRange(e.target.value as any)
                }}
                className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
              >
                <option value="7days">7 Days</option>
                <option value="30days">30 Days</option>
                <option value="90days">90 Days</option>
                <option value="custom">Custom</option>
              </select>
              
              {/* Export Button */}
              <button
                onClick={() => {
                  haptics.medium()
                  console.log('Export operational KPIs')
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            
            {/* Mobile Refresh Button */}
            <button
              onClick={() => {
                haptics.medium()
                refetch()
              }}
              disabled={loading && !data}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium w-full
                ${(loading && !data)
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }
              `}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
            
            {/* Custom Date Range for Mobile */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {operationalMetrics.map((metric) => (
            <motion.div
              key={metric.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 cursor-pointer hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all"
              onClick={() => {
                haptics.light()
                setSelectedMetric(metric)
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {metric.icon}
                  <h3 className="text-sm font-medium text-gray-400">{metric.label}</h3>
                </div>
                <Info className="h-4 w-4 text-gray-500 hover:text-gray-300 transition-colors" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${getMetricStatus(metric)}`}>
                    {formatValue(metric.value, metric.format)}
                  </span>
                  {metric.target && (
                    <span className="text-sm text-gray-500">
                      / {formatValue(metric.target, metric.format)}
                    </span>
                  )}
                </div>
                
                {metric.target && (
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        (metric.value / metric.target) >= 1 ? 'bg-green-500' :
                        (metric.value / metric.target) >= 0.9 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Placeholder for additional content */}
        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Operational Insights</h2>
          <p className="text-gray-400 mb-6">
            Detailed operational analytics and insights will be displayed here.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Coming Soon</h3>
              <p className="text-2xl font-bold">Crew Performance</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Coming Soon</h3>
              <p className="text-2xl font-bold">Route Optimization</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Coming Soon</h3>
              <p className="text-2xl font-bold">Resource Planning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Details Modal */}
      <AnimatePresence>
        {selectedMetric && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => {
              haptics.light()
              setSelectedMetric(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full bg-gray-900/90 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  {selectedMetric.icon}
                  <h2 className="text-2xl font-bold">{selectedMetric.label}</h2>
                </div>
                <button 
                  onClick={() => {
                    haptics.light()
                    setSelectedMetric(null)
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Current Value */}
                <div className="text-center py-4">
                  <p className={`text-5xl font-bold mb-2 ${getMetricStatus(selectedMetric)}`}>
                    {formatValue(selectedMetric.value, selectedMetric.format)}
                  </p>
                  {selectedMetric.target && (
                    <p className="text-gray-400">
                      Target: {formatValue(selectedMetric.target, selectedMetric.format)}
                    </p>
                  )}
                </div>

                {/* Description */}
                {selectedMetric.description && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Description</h3>
                    <p className="text-sm text-gray-400">
                      {selectedMetric.description}
                    </p>
                  </div>
                )}

                {/* Performance Analysis */}
                {selectedMetric.target && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Performance Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Performance</span>
                        <span className={getMetricStatus(selectedMetric)}>
                          {((selectedMetric.value / selectedMetric.target) * 100).toFixed(1)}% of target
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            (selectedMetric.value / selectedMetric.target) >= 1 ? 'bg-green-500' :
                            (selectedMetric.value / selectedMetric.target) >= 0.9 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((selectedMetric.value / selectedMetric.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom details for Revenue per Van */}
                {selectedMetric.id === 'revenue-per-van' && data?.kpiMetrics && (
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Fleet Details</h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Vans:</span>
                        <span className="text-white">6</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Today's Total Revenue:</span>
                        <span className="text-white">${data.kpiMetrics.convertedTodayDollars.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Revenue Gap per Van:</span>
                        <span className="text-red-400">${Math.max(0, 1500 - selectedMetric.value).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time Period */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    <span className="font-semibold">Time Period:</span> {
                      dateRange === 'custom' ? 'Custom date range' : 
                      `Last ${dateRange === '7days' ? '7' : dateRange === '30days' ? '30' : '90'} days`
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OperationalKPIs