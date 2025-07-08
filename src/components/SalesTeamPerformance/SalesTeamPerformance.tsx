import React, { useState, useMemo } from 'react'
import { Calendar, ChevronDown, Download, TrendingUp, TrendingDown, Clock, Target, Award, CheckCircle, XCircle } from 'lucide-react'
import { useDashboardData } from '../../hooks/useDashboardData'
import RainbowLoadingWave from '../RainbowLoadingWave'
import { haptics } from '../../utils/haptics'

interface QuoteDetails {
  quoteNumber: string
  salesperson: string
  clientName: string
  sentDate: string
  convertedDate: string | null
  status: string
  totalDollars: number
  speedToLead: number | null
  jobNumbers?: string
}

const SalesTeamPerformance: React.FC = () => {
  const { data, loading, error, refetch } = useDashboardData()
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'converted' | 'pending'>('all')
  const [sortBy, setSortBy] = useState<keyof QuoteDetails>('sentDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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
        if (startDate && endDate) {
          return {
            start: new Date(startDate),
            end: new Date(endDate)
          }
        }
        // Fallback to 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
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
  }, [data, selectedSalesperson, dateRange, startDate, endDate, statusFilter])

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

  // Export to CSV
  const exportToCSV = () => {
    haptics.medium()
    
    const headers = [
      'Quote Number', 'Salesperson', 'Client Name', 'Sent Date', 
      'Converted Date', 'Status', 'Total Value', 'Job Numbers'
    ]
    
    const rows = sortedQuotes.map(quote => [
      quote.quoteNumber,
      quote.salesperson,
      quote.clientName,
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Quotes</span>
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalQuotes}</p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Converted</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.convertedQuotes}</p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Conversion Rate</span>
              <Award className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.conversionRate.toFixed(1)}%</p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Value</span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalValue)}</p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Converted Value</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summaryStats.convertedValue)}</p>
          </div>
        </div>

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
    </div>
  )
}

export default SalesTeamPerformance