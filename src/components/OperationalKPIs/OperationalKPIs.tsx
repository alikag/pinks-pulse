import React, { useState, useMemo, useEffect } from 'react'
import { Calendar, Download, Info, Star, XCircle, RefreshCw, Truck, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
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

interface LateJob {
  job_number: string
  name: string
  date_of_visit: string
  date_of_next_visit: string | null
  link_to_job: string
  value: number
  discount_applied: number | null
  notes: string
  days_late: number
  job_type: string
  salesperson: string
  status: string
}

const OperationalKPIs: React.FC = () => {
  const { data, loading, error, refetch, isRefreshing } = useDashboardData()
  const [selectedMetric, setSelectedMetric] = useState<OperationalMetric | null>(null)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [lateJobs, setLateJobs] = useState<LateJob[]>([])
  const [lateJobsLoading, setLateJobsLoading] = useState(false)
  const [lateJobsSummary, setLateJobsSummary] = useState<any>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  // Calculate operational metrics from the data
  const operationalMetrics = useMemo<OperationalMetric[]>(() => {
    if (!data) return []

    // Calculate revenue per van per day based on jobs completed today
    const totalVans = 6
    let revenuePerVanPerDay = 0
    
    if (data?.kpiMetrics?.jobsTodayValue) {
      // Use today's completed jobs value divided by number of vans
      revenuePerVanPerDay = data.kpiMetrics.jobsTodayValue / totalVans
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
        description: 'Average revenue per van from jobs completed today (6 vans total)'
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
      }
    ]
  }, [data])

  // Fetch late jobs data
  useEffect(() => {
    const fetchLateJobs = async () => {
      setLateJobsLoading(true)
      try {
        const response = await fetch('/.netlify/functions/late-jobs-details')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setLateJobs(data.late_jobs || [])
            setLateJobsSummary(data.summary || null)
          }
        }
      } catch (error) {
        console.error('Error fetching late jobs:', error)
      } finally {
        setLateJobsLoading(false)
      }
    }

    fetchLateJobs()
  }, [])

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

  // Toggle expanded notes
  const toggleNoteExpanded = (jobNumber: string) => {
    const newExpanded = new Set(expandedNotes)
    if (newExpanded.has(jobNumber)) {
      newExpanded.delete(jobNumber)
    } else {
      newExpanded.add(jobNumber)
    }
    setExpandedNotes(newExpanded)
    haptics.light()
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

        {/* Late Jobs Table */}
        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <h2 className="text-xl font-semibold">Late Jobs</h2>
                {lateJobsSummary && (
                  <span className="text-sm text-gray-400">
                    ({lateJobs.length} jobs, ${lateJobsSummary.total_value?.toLocaleString() || 0} total value)
                  </span>
                )}
              </div>
              {lateJobsLoading && (
                <div className="text-sm text-gray-400">Loading...</div>
              )}
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/60">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Job #</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date of Visit</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Next Visit</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Link</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Value</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Discount</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Internal Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lateJobs.length === 0 && !lateJobsLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      No late jobs found
                    </td>
                  </tr>
                ) : (
                  lateJobs.slice(0, 10).map((job) => (
                    <tr key={job.job_number} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {job.job_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {job.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={job.days_late > 7 ? 'text-red-400' : 'text-yellow-400'}>
                          {job.date_of_visit}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({job.days_late}d late)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {job.date_of_next_visit || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={job.link_to_job}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300 transition-colors inline-flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            haptics.light()
                          }}
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        ${job.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {job.discount_applied ? `$${job.discount_applied.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div className="flex items-start gap-2">
                          <div className={`flex-1 ${expandedNotes.has(job.job_number) ? '' : 'max-w-xs truncate'}`}>
                            {job.notes}
                          </div>
                          {job.notes && job.notes.length > 50 && (
                            <button
                              onClick={() => toggleNoteExpanded(job.job_number)}
                              className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                              aria-label={expandedNotes.has(job.job_number) ? 'Collapse note' : 'Expand note'}
                            >
                              {expandedNotes.has(job.job_number) ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Summary Stats */}
          {lateJobsSummary && lateJobs.length > 0 && (
            <div className="p-4 bg-gray-900/60 border-t border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Value:</span>
                  <span className="ml-2 font-medium">${lateJobsSummary.total_value?.toLocaleString() || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Avg Days Late:</span>
                  <span className="ml-2 font-medium">{lateJobsSummary.average_days_late || 0} days</span>
                </div>
                <div>
                  <span className="text-gray-400">Very Late (&gt;7d):</span>
                  <span className="ml-2 font-medium text-red-400">{lateJobsSummary.very_late_count || 0} jobs</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Jobs:</span>
                  <span className="ml-2 font-medium">{lateJobs.length}</span>
                </div>
              </div>
            </div>
          )}
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
                  <>
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">Fleet Details</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Vans:</span>
                          <span className="text-white">6</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Today's Jobs Revenue:</span>
                          <span className="text-white">${(data.kpiMetrics.jobsTodayValue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Number of Jobs Today:</span>
                          <span className="text-white">{data.kpiMetrics.jobsToday || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Revenue Gap per Van:</span>
                          <span className="text-red-400">${Math.max(0, 1500 - selectedMetric.value).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Today's Jobs List */}
                    {data.rawJobs && (
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">Today's Jobs</h3>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-400 border-b border-gray-700">
                              <tr>
                                <th className="text-left pb-2">Job #</th>
                                <th className="text-left pb-2">Type</th>
                                <th className="text-left pb-2">Salesperson</th>
                                <th className="text-right pb-2">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                              {data.rawJobs
                                .filter(job => {
                                  const jobDate = new Date(job.date);
                                  const today = new Date();
                                  return jobDate.toDateString() === today.toDateString();
                                })
                                .map((job, index) => (
                                  <tr key={job.job_number || index}>
                                    <td className="py-2 text-white">{job.job_number}</td>
                                    <td className="py-2 text-gray-300">{job.job_type || '-'}</td>
                                    <td className="py-2 text-gray-300">{job.salesperson}</td>
                                    <td className="py-2 text-right text-white">
                                      ${(job.calculated_value || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          {data.rawJobs.filter(job => {
                            const jobDate = new Date(job.date);
                            const today = new Date();
                            return jobDate.toDateString() === today.toDateString();
                          }).length === 0 && (
                            <p className="text-gray-500 text-center py-4">No jobs scheduled for today</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
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