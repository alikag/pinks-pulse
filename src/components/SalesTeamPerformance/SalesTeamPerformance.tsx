import React, { useState, useMemo } from 'react'
import { Calendar, ChevronDown, Download, TrendingUp, Clock, Target, Award, CheckCircle, Info, Star, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardData } from '../../hooks/useDashboardData'
import RainbowLoadingWave from '../RainbowLoadingWave'
import { haptics } from '../../utils/haptics'

interface QuoteDetails {
  quoteNumber: string
  salesperson: string
  clientName: string
  clientAddress: string
  sentDate: string
  convertedDate: string | null
  status: string
  totalDollars: number
  speedToLead: number | null
  jobNumbers?: string
}

interface SalespersonScore {
  name: string
  compositeScore: number
  quotesPerDay: number
  conversionRate: number
  avgDealSize: number
  totalRevenue: number
  quotesCount: number
  conversionsCount: number
}

interface SummaryMetric {
  id: string
  label: string
  value: number
  icon: React.ReactNode
  format: 'number' | 'currency' | 'percentage'
  color: string
}

const SalesTeamPerformance: React.FC = () => {
  const { data, loading, error, refetch } = useDashboardData()
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'converted' | 'pending'>('all')
  const [sortBy, setSortBy] = useState<keyof QuoteDetails>('sentDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showScoreDetails, setShowScoreDetails] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<SummaryMetric | null>(null)

  // Helper function to get display name for salesperson (proper case)
  const getDisplayName = (name: string): string => {
    if (!name) return 'Unknown'
    // Convert to proper case: "christian ruddy" -> "Christian Ruddy"
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }
  
  // Helper function to get salesperson thumbnail
  const getSalespersonThumbnail = (name: string): string | null => {
    const thumbnailMap: Record<string, string> = {
      'Christian Ruddy': '/christian-ruddy.jpg',
      'Luigi': '/luigi.jpg',
      'Michael Squires': '/michael-squires.jpg',
      // Add more mappings as images become available
    }
    
    // Try exact match first, then try display name format
    return thumbnailMap[name] || thumbnailMap[getDisplayName(name)] || null
  }

  // Parse date for filtering
  const parseDate = (dateStr: string | Date | any): Date | null => {
    if (!dateStr) return null
    
    try {
      // Handle BigQuery date objects
      if (typeof dateStr === 'object' && dateStr.value) {
        dateStr = dateStr.value
      }
      
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return null
      }
      
      return date
    } catch (e) {
      return null
    }
  }

  // Get date range filter dates
  const getDateRangeDates = () => {
    const now = new Date()
    let startDate: Date
    let endDate = now

    switch (dateRange) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate)
          }
        }
        // Fallback to 30 days
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: endDate
        }
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    return { start: startDate, end: endDate }
  }

  // Process quotes data
  const processedQuotes = useMemo<QuoteDetails[]>(() => {
    if (!data?.rawQuotes) return []
    
    const { start: rangeStart, end: rangeEnd } = getDateRangeDates()
    
    return data.rawQuotes
      .map(quote => {
        const sentDate = parseDate(quote.sent_date)
        const convertedDate = parseDate(quote.converted_date)
        const isConverted = quote.status?.toLowerCase() === 'converted' || 
                           quote.status?.toLowerCase() === 'won' ||
                           !!convertedDate
        
        // Calculate speed to lead (if available from requests data)
        // This would need to be calculated from the requests data if available
        
        return {
          quoteNumber: quote.quote_number,
          salesperson: getDisplayName(quote.salesperson),
          clientName: quote.client_name || 'Unknown Client',
          clientAddress: quote.client_address || 'No address provided',
          sentDate: sentDate?.toLocaleDateString() || '-',
          convertedDate: convertedDate?.toLocaleDateString() || null,
          status: isConverted ? 'Converted' : 'Pending',
          totalDollars: quote.total_dollars || 0,
          speedToLead: null, // Would need to calculate from requests data
          jobNumbers: quote.job_numbers,
          sentDateObj: sentDate,
          convertedDateObj: convertedDate
        }
      })
      .filter(quote => {
        // Filter by date range (use sent date for filtering)
        if (quote.sentDateObj) {
          if (quote.sentDateObj < rangeStart || quote.sentDateObj > rangeEnd) {
            return false
          }
        }
        
        // Filter by salesperson
        if (selectedSalesperson !== 'all' && quote.salesperson !== selectedSalesperson) {
          return false
        }
        
        // Filter by status
        if (statusFilter === 'converted' && quote.status !== 'Converted') {
          return false
        }
        if (statusFilter === 'pending' && quote.status !== 'Pending') {
          return false
        }
        
        return true
      })
  }, [data, selectedSalesperson, dateRange, customStartDate, customEndDate, statusFilter])

  // Sort data
  const sortedQuotes = useMemo(() => {
    return [...processedQuotes].sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]
      
      // Handle date sorting
      if (sortBy === 'sentDate') {
        aValue = (a as any).sentDateObj || new Date(0)
        bValue = (b as any).sentDateObj || new Date(0)
      }
      if (sortBy === 'convertedDate') {
        aValue = (a as any).convertedDateObj || new Date(0)
        bValue = (b as any).convertedDateObj || new Date(0)
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      // Handle numeric comparison
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [processedQuotes, sortBy, sortOrder])

  // Get unique salespeople for filter
  const salespeople = useMemo(() => {
    if (!data?.salespersons) return []
    return [...new Set(data.salespersons.map(sp => getDisplayName(sp.name)))].sort()
  }, [data])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalQuotes = sortedQuotes.length
    const convertedQuotes = sortedQuotes.filter(q => q.status === 'Converted').length
    const totalValue = sortedQuotes.reduce((sum, q) => sum + q.totalDollars, 0)
    const convertedValue = sortedQuotes.filter(q => q.status === 'Converted')
      .reduce((sum, q) => sum + q.totalDollars, 0)
    const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0
    
    return {
      totalQuotes,
      convertedQuotes,
      totalValue,
      convertedValue,
      conversionRate
    }
  }, [sortedQuotes])

  // Calculate composite performance scores by salesperson
  const salespersonScores = useMemo<SalespersonScore[]>(() => {
    // Group quotes by salesperson
    const salespersonData: Record<string, any> = {}
    
    sortedQuotes.forEach(quote => {
      if (!salespersonData[quote.salesperson]) {
        salespersonData[quote.salesperson] = {
          quotes: [],
          conversions: 0,
          totalRevenue: 0
        }
      }
      
      salespersonData[quote.salesperson].quotes.push(quote)
      if (quote.status === 'Converted') {
        salespersonData[quote.salesperson].conversions++
        salespersonData[quote.salesperson].totalRevenue += quote.totalDollars
      }
    })
    
    // Calculate scores for each salesperson
    const scores: SalespersonScore[] = []
    const daysInRange = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 30
    
    Object.entries(salespersonData).forEach(([name, data]) => {
      const quotesCount = data.quotes.length
      const conversionsCount = data.conversions
      const totalRevenue = data.totalRevenue
      
      // Calculate KPIs
      const quotesPerDay = quotesCount / daysInRange
      const conversionRate = quotesCount > 0 ? (conversionsCount / quotesCount) * 100 : 0
      const avgDealSize = conversionsCount > 0 ? totalRevenue / conversionsCount : 0
      
      // Calculate composite score (0-100)
      // Weights: Quotes/Day (30%), Conversion Rate (40%), Avg Deal Size (30%)
      const quotesPerDayScore = Math.min((quotesPerDay / 12) * 100, 100) * 0.3 // Target: 12 quotes/day
      const conversionRateScore = Math.min((conversionRate / 45) * 100, 100) * 0.4 // Target: 45% CVR
      const avgDealSizeScore = Math.min((avgDealSize / 3000) * 100, 100) * 0.3 // Target: $3000 avg deal
      
      const compositeScore = quotesPerDayScore + conversionRateScore + avgDealSizeScore
      
      scores.push({
        name,
        compositeScore: Math.round(compositeScore),
        quotesPerDay,
        conversionRate,
        avgDealSize,
        totalRevenue,
        quotesCount,
        conversionsCount
      })
    })
    
    // Sort by composite score
    return scores.sort((a, b) => b.compositeScore - a.compositeScore)
  }, [sortedQuotes, dateRange])

  // Handle sorting
  const handleSort = (column: keyof QuoteDetails) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    haptics.light()
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString()}`
  }

  // Format value based on type
  const formatValue = (value: number, format: 'number' | 'currency' | 'percentage'): string => {
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
      default:
        return value.toLocaleString()
    }
  }

  // Get metric calculation details
  const getMetricCalculationDetails = (metricId: string): { formula: string; description: string; notes?: string } => {
    switch (metricId) {
      case 'total-quotes':
        return {
          formula: 'COUNT(*) FROM quotes WHERE sent_date BETWEEN date_range_start AND date_range_end',
          description: 'Total number of quotes sent during the selected time period.',
          notes: 'Includes all quotes regardless of status (pending, converted, or lost).'
        }
      case 'converted-quotes':
        return {
          formula: 'COUNT(*) FROM quotes WHERE status = "Converted" AND sent_date BETWEEN date_range_start AND date_range_end',
          description: 'Number of quotes that were successfully converted to jobs.',
          notes: 'Only counts quotes with "Converted" status. Conversion may happen outside the selected date range.'
        }
      case 'conversion-rate':
        return {
          formula: '(converted_quotes ÷ total_quotes) × 100',
          description: 'Percentage of sent quotes that converted to jobs.',
          notes: 'Industry average is 30-40%. Above 45% is excellent performance.'
        }
      case 'total-value':
        return {
          formula: 'SUM(total_dollars) FROM quotes WHERE sent_date BETWEEN date_range_start AND date_range_end',
          description: 'Total dollar value of all quotes sent, regardless of conversion status.',
          notes: 'Represents potential revenue if all quotes were converted.'
        }
      case 'converted-value':
        return {
          formula: 'SUM(total_dollars) FROM quotes WHERE status = "Converted" AND sent_date BETWEEN date_range_start AND date_range_end',
          description: 'Total dollar value of quotes that converted to jobs.',
          notes: 'This is actual revenue generated from the quotes sent in this period.'
        }
      case 'composite-score':
        return {
          formula: '(Quotes/Day ÷ 12) × 30 + (CVR ÷ 45) × 40 + (Avg Deal ÷ $3,000) × 30',
          description: 'Weighted performance score based on three key metrics.',
          notes: 'Weights: Quotes per Day (30%), Conversion Rate (40%), Average Deal Size (30%). Score is capped at 100.'
        }
      default:
        return {
          formula: 'N/A',
          description: 'Metric calculation details not available.',
        }
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    haptics.medium()
    
    const headers = [
      'Quote Number', 'Salesperson', 'Client Name', 'Client Address', 'Sent Date', 
      'Converted Date', 'Status', 'Total Value', 'Job Numbers'
    ]
    
    const rows = sortedQuotes.map(quote => [
      quote.quoteNumber,
      quote.salesperson,
      quote.clientName,
      quote.clientAddress,
      quote.sentDate,
      quote.convertedDate || '',
      quote.status,
      quote.totalDollars,
      quote.jobNumbers || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-quotes-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <RainbowLoadingWave />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading sales data</p>
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
    <div className="flex-1 overflow-hidden bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-lg border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sales Team Performance</h1>
            <p className="text-sm text-gray-400 mt-1">Individual quote details and performance tracking</p>
          </div>
          
          <div className="flex items-center gap-4">
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                haptics.light()
                setStatusFilter(e.target.value as any)
              }}
              className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Status</option>
              <option value="converted">Converted Only</option>
              <option value="pending">Pending Only</option>
            </select>

            {/* Salesperson Filter */}
            <select
              value={selectedSalesperson}
              onChange={(e) => {
                haptics.light()
                setSelectedSalesperson(e.target.value)
              }}
              className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Salespeople</option>
              {salespeople.map(person => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div 
            className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
            onClick={() => {
              haptics.light()
              setSelectedMetric({
                id: 'total-quotes',
                label: 'Total Quotes',
                value: summaryStats.totalQuotes,
                icon: <Target className="h-5 w-5 text-blue-400" />,
                format: 'number',
                color: 'blue'
              })
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Quotes</span>
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalQuotes}</p>
          </div>

          <div 
            className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all cursor-pointer"
            onClick={() => {
              haptics.light()
              setSelectedMetric({
                id: 'converted-quotes',
                label: 'Converted Quotes',
                value: summaryStats.convertedQuotes,
                icon: <CheckCircle className="h-5 w-5 text-green-400" />,
                format: 'number',
                color: 'green'
              })
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Converted</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.convertedQuotes}</p>
          </div>

          <div 
            className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all cursor-pointer"
            onClick={() => {
              haptics.light()
              setSelectedMetric({
                id: 'conversion-rate',
                label: 'Conversion Rate',
                value: summaryStats.conversionRate,
                icon: <Award className="h-5 w-5 text-yellow-400" />,
                format: 'percentage',
                color: 'yellow'
              })
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Conversion Rate</span>
              <Award className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.conversionRate.toFixed(1)}%</p>
          </div>

          <div 
            className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
            onClick={() => {
              haptics.light()
              setSelectedMetric({
                id: 'total-value',
                label: 'Total Value',
                value: summaryStats.totalValue,
                icon: <TrendingUp className="h-5 w-5 text-purple-400" />,
                format: 'currency',
                color: 'purple'
              })
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Value</span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalValue)}</p>
          </div>

          <div 
            className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all cursor-pointer"
            onClick={() => {
              haptics.light()
              setSelectedMetric({
                id: 'converted-value',
                label: 'Converted Value',
                value: summaryStats.convertedValue,
                icon: <TrendingUp className="h-5 w-5 text-green-400" />,
                format: 'currency',
                color: 'green'
              })
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Converted Value</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summaryStats.convertedValue)}</p>
          </div>
        </div>

        {/* Performance Scores by Salesperson */}
        {salespersonScores.length > 0 && (
          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Performance Scores by Salesperson
                </h3>
                <button
                  onClick={() => {
                    haptics.light()
                    setShowScoreDetails(!showScoreDetails)
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Info className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <span className="text-sm text-gray-400">{dateRange === 'custom' ? 'Custom period' : `Last ${dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90} days`}</span>
            </div>

            {/* Score Calculation Explanation */}
            {showScoreDetails && (
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">Composite Score Calculation</h4>
                <p className="text-sm text-gray-300 mb-2">
                  The performance score is calculated using three key metrics with the following weights:
                </p>
                <ul className="text-sm text-gray-400 space-y-1 ml-4">
                  <li>• <span className="text-gray-300">Quotes per Day (30%)</span> - Target: 12 quotes/day</li>
                  <li>• <span className="text-gray-300">Conversion Rate (40%)</span> - Target: 45% conversion rate</li>
                  <li>• <span className="text-gray-300">Average Deal Size (30%)</span> - Target: $3,000 per deal</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Score = (Quotes/Day ÷ 12) × 30 + (CVR ÷ 45) × 40 + (Avg Deal ÷ $3,000) × 30
                </p>
              </div>
            )}

            {/* Scores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salespersonScores.map((person, index) => (
                <div 
                  key={person.name} 
                  className="bg-gray-800/50 rounded-lg p-4 relative overflow-hidden hover:bg-gray-700/50 transition-all cursor-pointer"
                  onClick={() => {
                    haptics.light()
                    setSelectedMetric({
                      id: 'composite-score',
                      label: `${person.name} - Performance Score`,
                      value: person.compositeScore,
                      icon: <Star className="h-5 w-5 text-yellow-400" />,
                      format: 'number',
                      color: 'yellow'
                    })
                  }}>
                  {/* Rank Badge */}
                  {index < 3 && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-gray-900' : 
                        index === 1 ? 'bg-gray-400 text-gray-900' : 
                        'bg-orange-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                  )}

                  {/* Salesperson Info */}
                  <div className="flex items-center gap-3 mb-3">
                    {getSalespersonThumbnail(person.name) ? (
                      <img 
                        src={getSalespersonThumbnail(person.name)!} 
                        alt={person.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{person.name}</h4>
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${
                          person.compositeScore >= 80 ? 'text-green-400' : 
                          person.compositeScore >= 60 ? 'text-yellow-400' : 
                          'text-red-400'
                        }`}>
                          {person.compositeScore}
                        </div>
                        <span className="text-xs text-gray-500">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* KPI Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quotes/Day:</span>
                      <span className={`font-medium ${
                        person.quotesPerDay >= 12 ? 'text-green-400' : 
                        person.quotesPerDay >= 8 ? 'text-yellow-400' : 
                        'text-red-400'
                      }`}>
                        {person.quotesPerDay.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conversion Rate:</span>
                      <span className={`font-medium ${
                        person.conversionRate >= 45 ? 'text-green-400' : 
                        person.conversionRate >= 30 ? 'text-yellow-400' : 
                        'text-red-400'
                      }`}>
                        {person.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Deal Size:</span>
                      <span className="font-medium">{formatCurrency(person.avgDealSize)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2">
                      <span className="text-gray-400">Total Revenue:</span>
                      <span className="font-medium text-green-400">{formatCurrency(person.totalRevenue)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          person.compositeScore >= 80 ? 'bg-green-500' : 
                          person.compositeScore >= 60 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${person.compositeScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quotes Table */}
        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('quoteNumber')}
                  >
                    <div className="flex items-center gap-2">
                      Quote #
                      {sortBy === 'quoteNumber' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('salesperson')}
                  >
                    <div className="flex items-center gap-2">
                      Salesperson
                      {sortBy === 'salesperson' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('clientName')}
                  >
                    <div className="flex items-center gap-2">
                      Client
                      {sortBy === 'clientName' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('clientAddress')}
                  >
                    <div className="flex items-center gap-2">
                      Address
                      {sortBy === 'clientAddress' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('sentDate')}
                  >
                    <div className="flex items-center gap-2">
                      Sent Date
                      {sortBy === 'sentDate' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('convertedDate')}
                  >
                    <div className="flex items-center gap-2">
                      Converted Date
                      {sortBy === 'convertedDate' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortBy === 'status' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('totalDollars')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Value
                      {sortBy === 'totalDollars' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                    Job #
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedQuotes.map((quote) => (
                  <tr key={quote.quoteNumber} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono">{quote.quoteNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getSalespersonThumbnail(quote.salesperson) ? (
                          <img 
                            src={getSalespersonThumbnail(quote.salesperson)!} 
                            alt={quote.salesperson}
                            className="w-8 h-8 rounded-full object-cover border border-gray-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {quote.salesperson.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        )}
                        <span className="text-sm">{quote.salesperson}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{quote.clientName}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate" title={quote.clientAddress}>
                      {quote.clientAddress}
                    </td>
                    <td className="px-6 py-4 text-sm">{quote.sentDate}</td>
                    <td className="px-6 py-4 text-sm">{quote.convertedDate || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        quote.status === 'Converted' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {quote.status === 'Converted' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(quote.totalDollars)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">{quote.jobNumbers || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {sortedQuotes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No quotes found for the selected filters</p>
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
                  <p className="text-5xl font-bold mb-2">{formatValue(selectedMetric.value, selectedMetric.format)}</p>
                  <p className="text-gray-400">For {dateRange === 'custom' ? 'selected period' : `last ${dateRange === '7days' ? '7' : dateRange === '30days' ? '30' : '90'} days`}</p>
                </div>

                {/* Calculation Details */}
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Calculation Formula</h3>
                    <code className="text-xs text-blue-400 font-mono block p-2 bg-gray-900/50 rounded overflow-x-auto">
                      {getMetricCalculationDetails(selectedMetric.id).formula}
                    </code>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">How it works</h3>
                    <p className="text-sm text-gray-400">
                      {getMetricCalculationDetails(selectedMetric.id).description}
                    </p>
                  </div>
                  
                  {getMetricCalculationDetails(selectedMetric.id).notes && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-sm text-blue-200">
                        <span className="font-semibold">Note:</span> {getMetricCalculationDetails(selectedMetric.id).notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Filters Applied */}
                {(selectedSalesperson !== 'all' || statusFilter !== 'all') && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Active Filters</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSalesperson !== 'all' && (
                        <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">
                          Salesperson: {selectedSalesperson}
                        </span>
                      )}
                      {statusFilter !== 'all' && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                          Status: {statusFilter === 'converted' ? 'Converted Only' : 'Pending Only'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SalesTeamPerformance