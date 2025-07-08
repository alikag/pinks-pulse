import React, { useState, useMemo } from 'react'
import { Calendar, ChevronDown, Download, TrendingUp, TrendingDown, Clock, Target, Award } from 'lucide-react'
import { useDashboardData } from '../../hooks/useDashboardData'
import RainbowLoadingWave from '../RainbowLoadingWave'
import { haptics } from '../../utils/haptics'

interface SalesPersonMetrics {
  name: string
  quotesSent: number
  quotesConverted: number
  conversionRate: number
  valueSent: number
  valueConverted: number
  avgQuoteValue: number
  avgSpeedToLead: number | null | undefined
  quotesPerDay: number
  performanceVsTarget: number // percentage above/below target
}

const SalesTeamPerformance: React.FC = () => {
  const { data, loading, error, refetch } = useDashboardData()
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [sortBy, setSortBy] = useState<keyof SalesPersonMetrics>('valueConverted')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Calculate date range in days
  const getDaysInRange = () => {
    switch (dateRange) {
      case '7days': return 7
      case '30days': return 30
      case '90days': return 90
      case 'custom': {
        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        }
        return 30 // fallback
      }
      default: return 30
    }
  }

  // Process salesperson data
  const processedData = useMemo<SalesPersonMetrics[]>(() => {
    if (!data?.salespersons) return []
    
    const daysInRange = getDaysInRange()
    const dailyQuoteTarget = 12 // Target quotes per day
    
    return data.salespersons
      .filter(sp => selectedSalesperson === 'all' || sp.name === selectedSalesperson)
      .map(sp => {
        const avgQuoteValue = sp.quotesSent > 0 ? sp.valueSent / sp.quotesSent : 0
        const quotesPerDay = sp.quotesSent / daysInRange
        const performanceVsTarget = (quotesPerDay / dailyQuoteTarget) * 100
        
        return {
          name: sp.name,
          quotesSent: sp.quotesSent,
          quotesConverted: sp.quotesConverted,
          conversionRate: sp.conversionRate,
          valueSent: sp.valueSent,
          valueConverted: sp.valueConverted,
          avgQuoteValue,
          avgSpeedToLead: sp.avgSpeedToLead,
          quotesPerDay,
          performanceVsTarget
        }
      })
  }, [data, selectedSalesperson, dateRange, startDate, endDate])

  // Sort data
  const sortedData = useMemo(() => {
    return [...processedData].sort((a, b) => {
      let aValue: any = a[sortBy] ?? 0
      let bValue: any = b[sortBy] ?? 0
      
      // Handle string comparison for name field
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      // Convert to numbers for numeric comparison
      aValue = Number(aValue) || 0
      bValue = Number(bValue) || 0
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })
  }, [processedData, sortBy, sortOrder])

  // Get unique salespeople for filter
  const salespeople = useMemo(() => {
    if (!data?.salespersons) return []
    return [...new Set(data.salespersons.map(sp => sp.name))].sort()
  }, [data])

  // Handle sorting
  const handleSort = (column: keyof SalesPersonMetrics) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    haptics.light()
  }

  // Format value based on type
  const formatValue = (value: number | null | undefined, type: string): string => {
    if (value === null || value === undefined) return '-'
    
    switch (type) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'decimal':
        return value.toFixed(2)
      case 'time':
        if (value < 60) return `${Math.round(value)}m`
        if (value < 1440) return `${Math.round(value / 60)}h`
        return `${Math.round(value / 1440)}d`
      default:
        return value.toString()
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    haptics.medium()
    
    const headers = [
      'Name', 'Quotes Sent', 'Quotes Converted', 'Conversion Rate (%)', 
      'Value Sent ($)', 'Value Converted ($)', 'Avg Quote Value ($)', 
      'Avg Speed to Lead (min)', 'Quotes Per Day', 'Performance vs Target (%)'
    ]
    
    const rows = sortedData.map(row => [
      row.name,
      row.quotesSent,
      row.quotesConverted,
      row.conversionRate.toFixed(1),
      row.valueSent,
      row.valueConverted,
      Math.round(row.avgQuoteValue),
      row.avgSpeedToLead || 'N/A',
      row.quotesPerDay.toFixed(2),
      row.performanceVsTarget.toFixed(1)
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-team-performance-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
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
            <p className="text-sm text-gray-400 mt-1">Detailed performance metrics and analysis</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Quotes Sent</span>
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{sortedData.reduce((sum, sp) => sum + sp.quotesSent, 0)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Avg {(sortedData.reduce((sum, sp) => sum + sp.quotesPerDay, 0) / sortedData.length).toFixed(1)}/day per person
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Total Value Converted</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">
              ${sortedData.reduce((sum, sp) => sum + sp.valueConverted, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              From {sortedData.reduce((sum, sp) => sum + sp.quotesConverted, 0)} conversions
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Avg Conversion Rate</span>
              <Award className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">
              {sortedData.length > 0 
                ? (sortedData.reduce((sum, sp) => sum + sp.conversionRate, 0) / sortedData.length).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Target: 45%</p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Avg Speed to Lead</span>
              <Clock className="h-4 w-4 text-orange-400" />
            </div>
            <p className="text-2xl font-bold">
              {(() => {
                const validSpeeds = sortedData.filter(sp => sp.avgSpeedToLead !== null)
                if (validSpeeds.length === 0) return '-'
                const avgSpeed = validSpeeds.reduce((sum, sp) => sum + (sp.avgSpeedToLead || 0), 0) / validSpeeds.length
                return formatValue(avgSpeed, 'time')
              })()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Target: 24h</p>
          </div>
        </div>

        {/* Performance Table */}
        <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th 
                    className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortBy === 'name' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('quotesSent')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Quotes Sent
                      {sortBy === 'quotesSent' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('quotesConverted')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Converted
                      {sortBy === 'quotesConverted' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('conversionRate')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      CVR %
                      {sortBy === 'conversionRate' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('valueConverted')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Revenue
                      {sortBy === 'valueConverted' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('avgQuoteValue')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Avg Quote
                      {sortBy === 'avgQuoteValue' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('quotesPerDay')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Quotes/Day
                      {sortBy === 'quotesPerDay' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('avgSpeedToLead')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Speed to Lead
                      {sortBy === 'avgSpeedToLead' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('performanceVsTarget')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      vs Target
                      {sortBy === 'performanceVsTarget' && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((person, index) => (
                  <tr key={person.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {person.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          {index < 3 && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-900">{index + 1}</span>
                            </div>
                          )}
                        </div>
                        <span className="font-medium">{person.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">{person.quotesSent}</td>
                    <td className="px-6 py-4 text-right">{person.quotesConverted}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        person.conversionRate >= 45 ? 'text-green-400' : 
                        person.conversionRate >= 30 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {formatValue(person.conversionRate, 'percentage')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatValue(person.valueConverted, 'currency')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatValue(person.avgQuoteValue, 'currency')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        person.quotesPerDay >= 12 ? 'text-green-400' : 
                        person.quotesPerDay >= 8 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {formatValue(person.quotesPerDay, 'decimal')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatValue(person.avgSpeedToLead, 'time')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {person.performanceVsTarget >= 100 ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span className={`font-medium ${
                          person.performanceVsTarget >= 100 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatValue(person.performanceVsTarget, 'percentage')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesTeamPerformance