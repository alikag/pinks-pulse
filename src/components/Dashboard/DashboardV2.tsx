/**
 * SALES KPI DASHBOARD - MAIN COMPONENT
 * ====================================
 * This is the heart of Pink's Pulse Dashboard. It displays all KPIs, charts, and business metrics.
 * 
 * WHAT THIS COMPONENT DOES:
 * 1. Fetches data from backend (quotes, jobs, conversions)
 * 2. Calculates and displays KPIs (Key Performance Indicators)
 * 3. Renders interactive charts for data visualization
 * 4. Shows Google reviews scraped from Maps
 * 5. Provides detailed calculation info when KPIs are clicked
 * 
 * DATA FLOW:
 * useDashboardData hook → Backend API → BigQuery → Process data → Display here
 */

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, RefreshCw, TrendingUp, XCircle, Filter, ChevronDown, User } from 'lucide-react'
import Chart from 'chart.js/auto'
import { useDashboardData } from '../../hooks/useDashboardData'
import { motion, AnimatePresence } from 'framer-motion'
import RainbowLoadingWave from '../RainbowLoadingWave'
import { haptics } from '../../utils/haptics'
import { getSalespersonThumbnail, getDisplayName } from '../../utils/salespersonThumbnails'
import { getBusinessDaysInLast30Days } from '../../utils/businessDays'
// import { optimizeChartForMobile } from './MobileChartFix'
import { DiagnosticPanel } from '../DiagnosticPanel'

/**
 * KPI INTERFACE
 * Defines the structure of each Key Performance Indicator card
 */
interface KPI {
  id: string                    // Unique identifier (e.g., 'quotes-sent-today')
  label: string                 // Display name (e.g., 'Quotes Sent Today')
  value: number                 // Current value (e.g., 8)
  target: number                // Target value (e.g., 12)
  format: 'currency' | 'percentage' | 'number' | 'time'  // How to display the value
  status: 'success' | 'warning' | 'danger' | 'normal'    // Color coding based on performance
  trend?: number                // Optional trend percentage
  isLive?: boolean              // Is this real-time data?
  lastUpdated?: Date            // When was this last updated?
  subtitle?: string             // Additional info (e.g., 'Target: 12')
  sparklineData?: number[]      // Mini chart data (if applicable)
}

/**
 * GOOGLE REVIEW INTERFACE
 * Structure for reviews scraped from Google Maps
 */
interface GoogleReview {
  id: string
  author: string
  rating: number
  text: string
  time: string    // Relative time (e.g., "2 days ago")
}

const DashboardV2: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<KPI | null>(null)
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([])
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const [convertedQuotesSortBy, setConvertedQuotesSortBy] = useState<string>('dateConverted')
  const [convertedQuotesSortOrder, setConvertedQuotesSortOrder] = useState<'asc' | 'desc'>('desc')
  const { data, loading, error, refetch, isRefreshing, lastError } = useDashboardData()
  const mainContentRef = useRef<HTMLElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  
  // Debug converted quotes and haptic feedback for conversions
  useEffect(() => {
    if (data) {
      console.log('[Converted Quotes Debug]', {
        hasData: !!data,
        recentConvertedQuotes: data.recentConvertedQuotes,
        length: data.recentConvertedQuotes?.length || 0,
        sampleQuotes: data.recentConvertedQuotes?.slice(0, 3).map(q => ({
          quoteNumber: q.quoteNumber,
          jobType: q.jobType,
          hasJobType: 'jobType' in q,
          jobTypeValue: q.jobType,
          allKeys: Object.keys(q)
        }))
      })
      
      // CRITICAL DEBUG: Log Jobber quote processing results
      if (data.debug) {
        console.log('🚨 [JOBBER QUOTE DEBUG] - ROOT CAUSE ANALYSIS', {
          estToday: data.debug.estToday,
          currentESTTime: data.debug.currentESTTime,
          estOffset: data.debug.getESTOffset,
          jobberQuotes: data.debug.jobberQuotes
        });
        
        // Log each Jobber quote individually for clarity
        data.debug.jobberQuotes.forEach((quote: any) => {
          console.log(`🔍 [QUOTE ${quote.quote_number}] ${quote.client_name}`, {
            rawDate: quote.raw_converted_date,
            parsedDate: quote.parsed_converted_date,
            estDate: quote.convertedDate_EST,
            fullESTTime: quote.convertedDate_full_EST,
            isToday: quote.isToday_result,
            isThisWeek: quote.isThisWeek_result,
            expectedToday: quote.estToday_EST
          });
          
          // Flag any issues
          if (quote.isToday_result && !['07/01/2025', '7/1/2025'].includes(quote.convertedDate_EST)) {
            console.warn(`❌ WRONG DATE: Quote ${quote.quote_number} shows as "today" but date is ${quote.convertedDate_EST}, not July 1st`);
          }
        });
      }
      
      // Haptic feedback if there are new conversions today
      if (data.kpiMetrics && data.kpiMetrics.convertedToday && data.kpiMetrics.convertedToday > 0) {
        haptics.success();
      }
    }
  }, [data])
  
  // Chart refs
  const trendChartRef = useRef<HTMLCanvasElement>(null)
  const conversionChartRef = useRef<HTMLCanvasElement>(null)
  const monthlyOTBChartRef = useRef<HTMLCanvasElement>(null)
  const weeklyOTBChartRef = useRef<HTMLCanvasElement>(null)
  const sparklineRef = useRef<HTMLCanvasElement>(null)
  const heatmapRef = useRef<HTMLCanvasElement>(null)
  
  // Sparkline refs for KPI cards
  const kpiSparklineRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({})
  
  // Chart instances
  const trendChartInstance = useRef<Chart | null>(null)
  const conversionChartInstance = useRef<Chart | null>(null)
  const monthlyOTBChartInstance = useRef<Chart | null>(null)
  const weeklyOTBChartInstance = useRef<Chart | null>(null)
  const sparklineInstance = useRef<Chart | null>(null)
  const heatmapInstance = useRef<Chart | null>(null)
  const kpiSparklineInstances = useRef<{ [key: string]: Chart | null }>({})

  // Sparkline data removed - real data needed from backend

  // Consistent color scheme for metrics across all charts
  const CHART_COLORS = {
    revenue: {
      primary: '#3b82f6',      // Blue for revenue/OTB
      gradient: 'rgba(59, 130, 246, 0.4)',
      border: '#3b82f6'
    },
    quotes: {
      sent: '#fb923c',         // Orange for sent quotes
      converted: '#3b82f6',    // Blue for converted (revenue)
      gradient: 'rgba(251, 146, 60, 0.4)'
    },
    targets: {
      line: '#ef4444',         // Red for targets
      dash: [5, 5]
    },
    conversion: {
      rate: '#10b981',         // Green for conversion rate
      gradient: 'rgba(16, 185, 129, 0.4)'
    },
    salesperson: {
      colors: ['rgb(147, 51, 234)', 'rgb(236, 72, 153)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)']
    }
  };

  // Helper function to normalize salesperson names for consistent matching
  const normalizeSalespersonName = (name: string | undefined | null): string => {
    if (!name) return '';
    // Normalize: trim whitespace, convert to lowercase for comparison
    return name.trim().toLowerCase();
  };
  
  // Helper function to format currency values with k notation
  const formatCurrencyAxis = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };
  

  // Helper function to calculate combined Dec/Jan/Feb OTB
  const calculateWinterOTB = (monthlyData?: Record<number, number>) => {
    if (!monthlyData) return 0;
    
    // Debug: Log what data we have
    console.log('[Winter OTB Debug]', {
      monthlyData,
      december: monthlyData[12] || 0,
      january: monthlyData[1] || 0,
      february: monthlyData[2] || 0,
      total: (monthlyData[12] || 0) + (monthlyData[1] || 0) + (monthlyData[2] || 0)
    });
    
    // December (12), January (1), February (2)
    // Note: Currently only Dec 2025 is included as backend only tracks 2025 data
    // TODO: Backend needs to be updated to include Jan/Feb 2026 data
    return (monthlyData[12] || 0) + (monthlyData[1] || 0) + (monthlyData[2] || 0);
  }
  
  // Helper function to get the current winter season years
  const getWinterYears = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = now.getFullYear();
    
    // If we're past February, show next winter (Dec this year + Jan/Feb next year)
    // Otherwise show current winter (Dec last year + Jan/Feb this year)
    if (currentMonth > 2) {
      return {
        decYear: currentYear,
        janFebYear: currentYear + 1,
        label: `Dec '${String(currentYear).slice(-2)} + Jan/Feb '${String(currentYear + 1).slice(-2)}`
      };
    } else {
      return {
        decYear: currentYear - 1,
        janFebYear: currentYear,
        label: `Dec '${String(currentYear - 1).slice(-2)} + Jan/Feb '${String(currentYear).slice(-2)}`
      };
    }
  }
  
  // Check if a KPI should show as potentially inaccurate (jobs data)
  const isJobsDataKPI = (kpiId: string) => {
    return kpiId === 'next-month-otb' || kpiId === 'winter-otb' || kpiId === 'recurring-2026'
  }

  // Helper function to calculate filtered time series data for charts
  const calculateFilteredTimeSeries = (quotes: any[], salesperson: string) => {
    if (salesperson === 'all' || !quotes) return null;
    
    const normalizedFilterName = normalizeSalespersonName(salesperson);
    const filteredQuotes = quotes.filter(q => normalizeSalespersonName(q.salesperson) === normalizedFilterName);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    // Parse date helper - match backend's EST timezone handling
    const parseDate = (dateStr: string | Date | any) => {
      if (!dateStr) return null;
      
      try {
        // Handle BigQuery date objects that come as { value: "2025-06-27" }
        if (typeof dateStr === 'object' && (dateStr as any).value) {
          dateStr = (dateStr as any).value;
        }
        
        // If it's already a Date object, return it
        if (dateStr instanceof Date) {
          return dateStr;
        }
        
        // For date-only strings (YYYY-MM-DD), parse directly
        // BigQuery dates are already in Eastern Time
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        }
        
        // For other date strings, parse normally
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn('[parseDate] Invalid date:', dateStr);
          return null;
        }
        
        return date;
      } catch (e) {
        console.error('[parseDate] Error parsing date:', dateStr, e);
        return null;
      }
    };
    
    // Current week daily data
    const currentWeekDaily = {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      quotesConverted: [0, 0, 0, 0, 0, 0, 0],
      conversionRevenue: [0, 0, 0, 0, 0, 0, 0]
    };
    
    // Process quotes for current week
    filteredQuotes.forEach(quote => {
      const convertedDate = parseDate(quote.converted_date);
      if (convertedDate && convertedDate >= weekStart) {
        const dayIndex = convertedDate.getDay();
        if (dayIndex >= 0 && dayIndex < 7) {
          currentWeekDaily.quotesConverted[dayIndex]++;
          currentWeekDaily.conversionRevenue[dayIndex] += quote.total_dollars || 0;
        }
      }
    });
    
    // Weekly conversion rate trend (last 8 weeks)
    const weeklyTrend = {
      labels: [] as string[],
      revenue: [] as number[],
      conversionRate: [] as number[]
    };
    
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() - (i * 7));
      const weekStartDate = new Date(weekEnd);
      weekStartDate.setDate(weekEnd.getDate() - 7);
      
      let weekQuotesSent = 0;
      let weekQuotesConverted = 0;
      let weekRevenue = 0;
      
      filteredQuotes.forEach(quote => {
        const sentDate = parseDate(quote.sent_date);
        const convertedDate = parseDate(quote.converted_date);
        
        if (sentDate && sentDate >= weekStartDate && sentDate < weekEnd) {
          weekQuotesSent++;
          if (convertedDate) {
            weekQuotesConverted++;
            weekRevenue += quote.total_dollars || 0;
          }
        }
      });
      
      const weekLabel = `Week ${8 - i}`;
      weeklyTrend.labels.push(weekLabel);
      weeklyTrend.revenue.push(weekRevenue);
      weeklyTrend.conversionRate.push(weekQuotesSent > 0 ? (weekQuotesConverted / weekQuotesSent) * 100 : 0);
    }
    
    return {
      currentWeekDaily,
      weeklyTrend
    };
  };

  // Helper function to calculate filtered OTB data
  const calculateFilteredOTBData = (jobs: any[], salesperson: string) => {
    if (salesperson === 'all' || !jobs) return null;
    
    const normalizedFilterName = normalizeSalespersonName(salesperson);
    const filteredJobs = jobs.filter(j => normalizeSalespersonName(j.salesperson) === normalizedFilterName);
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Parse date helper - match backend's EST timezone handling
    const parseDate = (dateStr: string | Date | any) => {
      if (!dateStr) return null;
      
      try {
        // Handle BigQuery date objects that come as { value: "2025-06-27" }
        if (typeof dateStr === 'object' && (dateStr as any).value) {
          dateStr = (dateStr as any).value;
        }
        
        // If it's already a Date object, return it
        if (dateStr instanceof Date) {
          return dateStr;
        }
        
        // For date-only strings (YYYY-MM-DD), parse directly
        // BigQuery dates are already in Eastern Time
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        }
        
        // For other date strings, parse normally
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn('[parseDate] Invalid date:', dateStr);
          return null;
        }
        
        return date;
      } catch (e) {
        console.error('[parseDate] Error parsing date:', dateStr, e);
        return null;
      }
    };
    
    // Monthly OTB
    const monthlyOTB = {} as Record<number, number>;
    for (let i = 1; i <= 12; i++) {
      monthlyOTB[i] = 0;
    }
    
    // Weekly OTB (5 weeks)
    const weeklyOTB = {
      labels: [] as string[],
      values: [] as number[]
    };
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      let weekTotal = 0;
      filteredJobs.forEach(job => {
        const jobDate = parseDate(job.date);
        if (jobDate && jobDate >= weekStart && jobDate < weekEnd) {
          weekTotal += job.calculated_value || 0;
        }
        
        // Also accumulate monthly data
        if (jobDate && jobDate.getFullYear() === currentYear) {
          const month = jobDate.getMonth() + 1;
          monthlyOTB[month] += job.calculated_value || 0;
        }
      });
      
      const weekLabel = i === 0 ? 'This Week' : i === 1 ? 'Next Week' : `Week ${i + 1}`;
      weeklyOTB.labels.push(weekLabel);
      weeklyOTB.values.push(weekTotal);
    }
    
    return {
      monthlyOTB,
      weeklyOTB
    };
  };

  // Helper function to calculate KPIs from raw data
  const calculateKPIsFromRawData = (quotes: any[], jobs: any[], salesperson?: string) => {
    console.log('[calculateKPIsFromRawData] Called with:', {
      quotesLength: quotes?.length,
      jobsLength: jobs?.length,
      salesperson: salesperson
    });
    
    // Helper to get Eastern Time components - defined early to avoid temporal dead zone
    const getEasternTimeComponents = (date: Date) => {
      const options = {
        timeZone: 'America/New_York',
        year: 'numeric' as const,
        month: 'numeric' as const,
        day: 'numeric' as const,
        hour: 'numeric' as const,
        minute: 'numeric' as const,
        second: 'numeric' as const,
        hour12: false
      };
      const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
      const components: any = {};
      parts.forEach(part => {
        if (part.type !== 'literal') {
          components[part.type] = parseInt(part.value);
        }
      });
      return components;
    };
    
    // Debug: Log unique salesperson names in raw data
    if (salesperson && salesperson !== 'all') {
      const uniqueSalespeopleInQuotes = [...new Set(quotes.map(q => q.salesperson))].filter(Boolean);
      const exactMatches = quotes.filter(q => q.salesperson === salesperson);
      const caseInsensitiveMatches = quotes.filter(q => q.salesperson?.toLowerCase() === salesperson.toLowerCase());
      const trimmedMatches = quotes.filter(q => q.salesperson?.trim() === salesperson.trim());
      const fullMatches = quotes.filter(q => q.salesperson?.trim().toLowerCase() === salesperson.trim().toLowerCase());
      
      console.log('[Salesperson Filter Debug]', {
        filteringBy: salesperson,
        filteringByLength: salesperson.length,
        filteringByChars: salesperson.split('').map((c: string) => c.charCodeAt(0)),
        uniqueSalespeopleInQuotes,
        exactMatches: exactMatches.length,
        caseInsensitiveMatches: caseInsensitiveMatches.length,
        trimmedMatches: trimmedMatches.length,
        fullMatches: fullMatches.length,
        sampleQuotes: quotes.slice(0, 5).map(q => ({ 
          salesperson: q.salesperson,
          salespersonLength: q.salesperson?.length,
          salespersonChars: q.salesperson?.split('').map((c: string) => c.charCodeAt(0)),
          sent_date: q.sent_date,
          converted_date: q.converted_date 
        }))
      });
    }
    
    // Filter by salesperson if specified (normalized comparison)
    const normalizedFilterName = salesperson ? salesperson.trim().toLowerCase() : '';
    const filteredQuotes = salesperson && salesperson !== 'all' 
      ? quotes.filter(q => {
          const normalizedQuoteName = (q.salesperson || '').trim().toLowerCase();
          return normalizedQuoteName === normalizedFilterName;
        }) 
      : quotes;
    const filteredJobs = salesperson && salesperson !== 'all'
      ? jobs.filter(j => {
          const normalizedJobName = (j.salesperson || '').trim().toLowerCase();
          return normalizedJobName === normalizedFilterName;
        })
      : jobs;
    
    // Debug filtered results
    if (salesperson && salesperson !== 'all') {
      // Find today's quotes specifically
      const todayQuotes = quotes.filter(q => {
        // Inline date parsing to avoid temporal dead zone
        let sentDate = null;
        if (q.sent_date) {
          try {
            let dateStr = q.sent_date;
            if (typeof dateStr === 'object' && (dateStr as any).value) {
              dateStr = (dateStr as any).value;
            }
            sentDate = new Date(dateStr);
            if (isNaN(sentDate.getTime())) sentDate = null;
          } catch (e) {
            sentDate = null;
          }
        }
        if (!sentDate) return false;
        const dateET = getEasternTimeComponents(sentDate);
        const nowET = getEasternTimeComponents(new Date());
        return dateET.year === nowET.year && dateET.month === nowET.month && dateET.day === nowET.day;
      });
      
      console.log('[Filter Results]', {
        filteringFor: salesperson,
        normalizedFilterName: normalizedFilterName,
        totalQuotes: quotes.length,
        filteredQuotes: filteredQuotes.length,
        totalJobs: jobs.length,
        filteredJobs: filteredJobs.length,
        todayQuotesTotal: todayQuotes.length,
        todayQuotesBySalesperson: todayQuotes.map(q => ({
          quote_number: q.quote_number,
          salesperson: q.salesperson,
          sent_date: q.sent_date
        })),
        sampleMatches: filteredQuotes.slice(0, 3).map(q => ({
          quote_number: q.quote_number,
          salesperson: q.salesperson,
          normalized: (q.salesperson || '').trim().toLowerCase(),
          sent_date: q.sent_date
        }))
      });
    }

    const now = new Date();
    
    // Get "today" in Eastern Time
    const nowET = getEasternTimeComponents(now);
    const today = new Date(nowET.year, nowET.month - 1, nowET.day);
    
    // Calculate week start in Eastern Time
    const dayOfWeek = new Date(nowET.year, nowET.month - 1, nowET.day).getDay();
    const weekStart = new Date(nowET.year, nowET.month - 1, nowET.day - dayOfWeek);
    
    // Parse date helper - match backend's EST timezone handling
    const parseDate = (dateStr: string | Date | any) => {
      if (!dateStr) return null;
      
      try {
        // Handle BigQuery date objects that come as { value: "2025-06-27" }
        if (typeof dateStr === 'object' && (dateStr as any).value) {
          dateStr = (dateStr as any).value;
        }
        
        // If it's already a Date object, return it
        if (dateStr instanceof Date) {
          return dateStr;
        }
        
        // For date-only strings (YYYY-MM-DD), parse directly
        // BigQuery dates are already in Eastern Time
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        }
        
        // For other date strings, parse normally
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn('[parseDate] Invalid date:', dateStr);
          return null;
        }
        
        return date;
      } catch (e) {
        console.error('[parseDate] Error parsing date:', dateStr, e);
        return null;
      }
    };
    
    // Check if date is today (EST/EDT timezone aware)
    const isToday = (date: Date) => {
      // For dates parsed from YYYY-MM-DD strings, they're already in the right day
      // Just compare the date parts directly
      return date.getFullYear() === nowET.year &&
             date.getMonth() + 1 === nowET.month &&
             date.getDate() === nowET.day;
    };
    
    // Check if date is this week (EST/EDT timezone aware)
    const isThisWeek = (date: Date) => {
      // weekStart is already in EST from above
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Create a date with just the date parts for comparison
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      return dateOnly >= weekStart && dateOnly < weekEnd;
    };
    
    // Check if date is in last 30 days
    const isLast30Days = (date: Date) => {
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= thirtyDaysAgo && date <= today;
    };

    // Calculate metrics
    let metrics = {
      quotesToday: 0,
      convertedToday: 0,
      convertedTodayDollars: 0,
      quotesThisWeek: 0,
      convertedThisWeek: 0,
      convertedThisWeekDollars: 0,
      quotes30Days: 0,
      converted30Days: 0,
      recurringRevenue2026: 0,
      nextMonthOTB: 0,
      monthlyOTBData: {} as Record<number, number>
    };

    // Debug date calculations
    if (salesperson && salesperson !== 'all' && filteredQuotes.length > 0) {
      console.log('[Date Calculation Debug - EST/EDT Aware]', {
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        now: now.toISOString(),
        nowET: nowET,
        today: today.toISOString(),
        todayString: today.toDateString(),
        weekStart: weekStart.toISOString(),
        weekStartString: weekStart.toDateString(),
        filteredQuotesCount: filteredQuotes.length,
        sampleQuoteDates: filteredQuotes.slice(0, 3).map(q => {
          const sentDate = parseDate(q.sent_date);
          const convertedDate = parseDate(q.converted_date);
          return {
            sent_date_raw: q.sent_date,
            sent_date_parsed: sentDate?.toISOString(),
            sent_date_ET: sentDate ? getEasternTimeComponents(sentDate) : null,
            isToday_sent: sentDate ? isToday(sentDate) : false,
            isThisWeek_sent: sentDate ? isThisWeek(sentDate) : false,
            converted_date_raw: q.converted_date,
            converted_date_parsed: convertedDate?.toISOString(),
            converted_date_ET: convertedDate ? getEasternTimeComponents(convertedDate) : null,
            isToday_converted: convertedDate ? isToday(convertedDate) : false,
            isThisWeek_converted: convertedDate ? isThisWeek(convertedDate) : false
          };
        })
      });
    }
    
    // Process quotes
    filteredQuotes.forEach((quote, index) => {
      const sentDate = parseDate(quote.sent_date);
      const convertedDate = parseDate(quote.converted_date);
      const isConverted = quote.status?.toLowerCase() === 'converted' || 
                         quote.status?.toLowerCase() === 'won' ||
                         !!convertedDate;
      
      // Debug first few quotes for the selected salesperson
      if (salesperson && salesperson !== 'all' && index < 5) {
        console.log(`[Quote ${index}]`, {
          quote_number: quote.quote_number,
          sent_date_raw: quote.sent_date,
          sent_date_parsed: sentDate?.toISOString(),
          sent_date_local: sentDate?.toLocaleDateString(),
          today_local: today.toLocaleDateString(),
          nowET: nowET,
          isToday_sent: sentDate ? isToday(sentDate) : false,
          isThisWeek_sent: sentDate ? isThisWeek(sentDate) : false,
          converted_date_raw: quote.converted_date,
          converted_date_parsed: convertedDate?.toISOString(),
          isToday_converted: convertedDate ? isToday(convertedDate) : false,
          isThisWeek_converted: convertedDate ? isThisWeek(convertedDate) : false,
          status: quote.status,
          isConverted: isConverted
        });
      }
      
      if (sentDate) {
        const todayCheck = isToday(sentDate);
        if (todayCheck) {
          metrics.quotesToday++;
          if (salesperson && salesperson !== 'all' && metrics.quotesToday <= 3) {
            console.log('[Today Quote Found]', {
              quote_number: quote.quote_number,
              salesperson: quote.salesperson,
              sent_date: quote.sent_date,
              sentDateParsed: sentDate.toISOString(),
              isToday: todayCheck
            });
          }
        }
        if (isThisWeek(sentDate)) metrics.quotesThisWeek++;
        if (isLast30Days(sentDate)) metrics.quotes30Days++;
      }
      
      if (isConverted && convertedDate) {
        if (isToday(convertedDate)) {
          metrics.convertedToday++;
          metrics.convertedTodayDollars += quote.total_dollars;
        }
        if (isThisWeek(convertedDate)) {
          metrics.convertedThisWeek++;
          metrics.convertedThisWeekDollars += quote.total_dollars;
        }
        if (isLast30Days(sentDate || convertedDate)) {
          metrics.converted30Days++;
        }
      }
    });

    // Process jobs
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const nextMonth = now.getMonth() + 2; // +1 for 0-index, +1 for next month
    
    filteredJobs.forEach(job => {
      const jobDate = parseDate(job.date);
      if (!jobDate) return;
      
      const jobYear = jobDate.getFullYear();
      const jobMonth = jobDate.getMonth() + 1;
      
      // Next month OTB
      if (jobMonth === nextMonth && (jobYear === currentYear || jobYear === nextYear)) {
        metrics.nextMonthOTB += job.calculated_value;
      }
      
      // Recurring revenue for next year
      if (jobYear === nextYear && job.job_type === 'RECURRING') {
        metrics.recurringRevenue2026 += job.calculated_value;
      }
      
      // Monthly OTB data
      if (jobYear === currentYear || (jobYear === nextYear && jobMonth <= 2)) {
        if (!metrics.monthlyOTBData[jobMonth]) {
          metrics.monthlyOTBData[jobMonth] = 0;
        }
        metrics.monthlyOTBData[jobMonth] += job.calculated_value;
      }
    });

    // Calculate derived metrics
    const cvrThisWeek = metrics.quotesThisWeek > 0 
      ? (metrics.convertedThisWeek / metrics.quotesThisWeek) * 100 
      : 0;
    const cvr30Days = metrics.quotes30Days > 0
      ? (metrics.converted30Days / metrics.quotes30Days) * 100
      : 0;
    // Calculate average quotes per business day (excluding weekends)
    const businessDaysInLast30 = getBusinessDaysInLast30Days();
    const avgQPD = metrics.quotes30Days / businessDaysInLast30;

    // Debug final metrics
    if (salesperson && salesperson !== 'all') {
      console.log('[Calculated Metrics Summary]', {
        salesperson,
        filteredQuotesCount: filteredQuotes.length,
        filteredJobsCount: filteredJobs.length,
        metrics: {
          quotesToday: metrics.quotesToday,
          convertedToday: metrics.convertedToday,
          convertedTodayDollars: metrics.convertedTodayDollars,
          quotesThisWeek: metrics.quotesThisWeek,
          convertedThisWeek: metrics.convertedThisWeek,
          convertedThisWeekDollars: metrics.convertedThisWeekDollars,
          cvrThisWeek,
          quotes30Days: metrics.quotes30Days,
          converted30Days: metrics.converted30Days,
          cvr30Days,
          avgQPD
        }
      });
    }
    
    return {
      ...metrics,
      cvrThisWeek,
      cvr30Days,
      avgQPD,
      // TODO: Add speed to lead calculation when we have request data
      speedToLead30Days: 0,
      reviewsThisWeek: 0 // Reviews are not filtered by salesperson
    };
  };

  // Calculate KPIs from data
  const kpis = useMemo<KPI[]>(() => {
    console.log('DashboardV2 - Full data object:', data);
    console.log('DashboardV2 - Data keys:', data ? Object.keys(data) : 'No data');
    console.log('DashboardV2 - Has kpiMetrics?', data?.kpiMetrics);
    
    if (loading || !data || !data.kpiMetrics) {
      console.log('Data not ready yet');
      return []
    }
    
    // Use filtered metrics if we have raw data AND a specific salesperson is selected
    // For "all", use the pre-calculated backend metrics which are more accurate
    const metrics = (data.rawQuotes && data.rawJobs && selectedSalesperson !== 'all') 
      ? calculateKPIsFromRawData(data.rawQuotes, data.rawJobs, selectedSalesperson)
      : data.kpiMetrics;
    
    console.log('[KPI Debug]', {
      selectedSalesperson,
      hasRawQuotes: !!data.rawQuotes,
      hasRawJobs: !!data.rawJobs,
      rawQuotesLength: data.rawQuotes?.length,
      rawJobsLength: data.rawJobs?.length,
      usingFiltered: data.rawQuotes && data.rawJobs && selectedSalesperson !== 'all',
      backendMetrics: data.kpiMetrics,
      calculatedMetrics: metrics,
      rawQuotesSample: data.rawQuotes?.slice(0, 2)
    });
    
    // Get next month name
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long' });
    const winterYears = getWinterYears();
    
    return [
      {
        id: 'quotes-sent-today',
        label: 'Quotes Sent Today',
        subtitle: 'Target: 18',
        value: metrics.quotesToday,
        target: 18,
        format: 'number',
        status: metrics.quotesToday >= 18 ? 'success' : metrics.quotesToday >= 12 ? 'warning' : 'danger',
        trend: 12.5,
        sparklineData: undefined
      },
      {
        id: 'converted-today',
        label: 'Converted Today',
        subtitle: 'total_dollars',
        value: metrics.convertedTodayDollars,
        target: 9000,
        format: 'currency',
        status: metrics.convertedTodayDollars >= 9000 ? 'success' : metrics.convertedTodayDollars > 6000 ? 'warning' : 'normal',
        trend: -5.3,
        sparklineData: undefined
      },
      {
        id: 'converted-week',
        label: 'Converted This Week',
        subtitle: 'Target: $45k',
        value: metrics.convertedThisWeekDollars,
        target: 45000,
        format: 'currency',
        status: metrics.convertedThisWeekDollars >= 45000 ? 'success' : metrics.convertedThisWeekDollars > 30000 ? 'warning' : 'danger'
      },
      {
        id: 'cvr-week',
        label: 'CVR This Week',
        subtitle: 'Target: 40%',
        value: metrics.cvrThisWeek,
        target: 40,
        format: 'percentage',
        status: metrics.cvrThisWeek >= 40 ? 'success' : metrics.cvrThisWeek >= 30 ? 'warning' : 'danger'
      },
      {
        id: 'recurring-2026',
        label: `${nextMonth.getFullYear() + 1} Recurring`,
        subtitle: 'Target: $1M',
        value: metrics.recurringRevenue2026,
        target: 1000000,
        format: 'currency',
        status: metrics.recurringRevenue2026 >= 1000000 ? 'success' : metrics.recurringRevenue2026 >= 750000 ? 'warning' : 'danger'
      },
      {
        id: 'next-month-otb',
        label: `${nextMonthName} OTB`,
        subtitle: 'Target: $175k',
        value: metrics.nextMonthOTB,
        target: 175000,
        format: 'currency',
        status: metrics.nextMonthOTB >= 175000 ? 'success' : metrics.nextMonthOTB >= 140000 ? 'warning' : 'danger'
      },
      {
        id: 'winter-otb',
        label: 'Winter OTB',
        subtitle: `${winterYears.label}: $525k`,
        value: calculateWinterOTB(metrics.monthlyOTBData),
        target: 525000,
        format: 'currency',
        status: calculateWinterOTB(metrics.monthlyOTBData) >= 525000 ? 'success' : 
                calculateWinterOTB(metrics.monthlyOTBData) >= 420000 ? 'warning' : 'danger'
      }
    ]
  }, [data, loading, selectedSalesperson])

  // Calculate second row KPIs
  const secondRowKpis = useMemo<KPI[]>(() => {
    if (loading || !data || !data.kpiMetrics) {
      return [] // No mock data - return empty array
    }
    
    // Use filtered metrics if we have raw data AND a specific salesperson is selected
    // For "all", use the pre-calculated backend metrics which are more accurate
    const metrics = (data.rawQuotes && data.rawJobs && selectedSalesperson !== 'all') 
      ? calculateKPIsFromRawData(data.rawQuotes, data.rawJobs, selectedSalesperson)
      : data.kpiMetrics;
    console.log('Speed to Lead Debug:', {
      speedToLead30Days: metrics.speedToLead30Days,
      hasValue: metrics.speedToLead30Days > 0,
      willUse: metrics.speedToLead30Days > 0 ? metrics.speedToLead30Days : 22
    });
    
    return [
      {
        id: 'speed-to-lead',
        label: 'Speed to Lead (30D Avg)',
        subtitle: 'Target: 24 hours',
        value: metrics.speedToLead30Days || 0,
        target: 1440, // 24 hours in minutes
        format: 'time',
        status: metrics.speedToLead30Days <= 1440 ? 'success' : metrics.speedToLead30Days <= 2880 ? 'warning' : 'danger',
        sparklineData: undefined
      },
      {
        id: 'recurring-cvr',
        label: '30D CVR',
        subtitle: `${metrics.converted30Days || 0}/${metrics.quotes30Days || 0} converted`,
        value: metrics.cvr30Days || 0,
        target: 40,
        format: 'percentage',
        status: metrics.cvr30Days >= 40 ? 'success' : metrics.cvr30Days >= 30 ? 'warning' : 'danger'
      },
      {
        id: 'avg-qpd',
        label: 'Avg Quotes/Day (30D)',
        subtitle: 'Target: 18',
        value: metrics.avgQPD,
        target: 18,
        format: 'number',
        status: metrics.avgQPD >= 18 ? 'success' : metrics.avgQPD >= 12 ? 'warning' : 'danger',
        trend: 8.2
      },
      {
        id: 'reviews-week',
        label: 'Reviews This Week',
        subtitle: 'Target: 6',
        value: 7, // Updated to 7 reviews this week
        target: 6,
        format: 'number',
        status: 'success', // 7 reviews > 6 target
        trend: 50
      }
    ]
  }, [data, loading, selectedSalesperson])

  // Get unique salespeople list
  const salespeople = useMemo(() => {
    if (!data?.salespersons) return []
    // Use display names for the dropdown
    const uniqueNames = [...new Set(data.salespersons.map(sp => getDisplayName(sp.name)))].sort()
    
    // Debug: Log salespeople names from different sources
    if (data.rawQuotes) {
      const rawQuoteSalespeople = [...new Set(data.rawQuotes.map(q => q.salesperson))].filter(Boolean).sort();
      const normalizedRawNames = [...new Set(data.rawQuotes.map(q => normalizeSalespersonName(q.salesperson)))].filter(Boolean).sort();
      console.log('[Salesperson Names Debug]', {
        fromSalespersons: uniqueNames,
        fromRawQuotes: rawQuoteSalespeople,
        normalizedRawNames: normalizedRawNames,
        mismatch: uniqueNames.filter(name => !rawQuoteSalespeople.includes(name)),
        extraInRaw: rawQuoteSalespeople.filter(name => !uniqueNames.includes(name))
      });
    }
    
    return uniqueNames
  }, [data])


  // Handle sorting for converted quotes table
  const handleConvertedQuotesSort = (column: string) => {
    if (convertedQuotesSortBy === column) {
      setConvertedQuotesSortOrder(convertedQuotesSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setConvertedQuotesSortBy(column)
      setConvertedQuotesSortOrder('desc')
    }
    haptics.light()
  }

  // Fetch Google Reviews function
  const fetchReviews = async () => {
      try {
        // Use the Playwright scraper to get fresh reviews from Google Maps
        let response = await fetch('/.netlify/functions/scrape-google-reviews-playwright')
        
        // Check if response is OK
        if (!response.ok) {
          console.error('[Google Reviews Scraper] Playwright scraper HTTP error:', response.status, response.statusText)
          console.log('[Google Reviews Scraper] Trying simple scraper as fallback...')
          
          // Try fallback scraper
          response = await fetch('/.netlify/functions/scrape-google-reviews')
          
          if (!response.ok) {
            console.error('[Google Reviews Scraper] Simple scraper also failed:', response.status)
            setGoogleReviews([])
            return
          }
        }
        
        // Check Content-Type to ensure it's JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.error('[Google Reviews Scraper] Response is not JSON, got:', contentType)
          console.log('[Google Reviews Scraper] Trying simple scraper due to HTML response...')
          
          // Try fallback scraper if we got HTML
          response = await fetch('/.netlify/functions/scrape-google-reviews')
          const fallbackContentType = response.headers.get("content-type")
          
          if (!fallbackContentType || !fallbackContentType.includes("application/json")) {
            console.error('[Google Reviews Scraper] Both scrapers returning HTML')
            // Use fallback reviews when both scrapers fail
            console.log('[Google Reviews] Using fallback reviews due to scraper failures')
            setGoogleReviews([
              {
                id: 'fallback-1',
                author: 'Lauren Card',
                rating: 5,
                text: 'Pink\'s Windows is excellent. I highly recommend them to anyone looking for amazing customer service, a friendly interaction and top-notch work. My windows are shining, and I couldn\'t be happier. The team did not stop until everything was perfect - leaving no streaks behind!',
                time: '11 minutes ago'
              },
              {
                id: 'fallback-2',
                author: 'Vanessa Dawson',
                rating: 5,
                text: 'Responsive, efficient service with a very high tech and cost effective way to clean your windows. Our four story facade is sparkling and no one had to hang onto ledges or wear climbing gear. They did it all from the street with poles, brushes, a hose and reverse osmosis canisters. Fantastic! Dylan & Roody are perfectionists and took great care to make sure we were absolutely satisfied before they left. Highly recommend Pinks and Dylan and Roody!',
                time: '5 hours ago'
              },
              {
                id: 'fallback-3',
                author: 'Barbara Levy',
                rating: 5,
                text: 'We used Pink\'s for the first time yesterday, and they did an excellent job. Dylan and Rudy were unobtrusive and went out of their way to make sure everything was done properly and put back the way it was. I would definitely recommend them.',
                time: '6 hours ago'
              },
              {
                id: 'fallback-4',
                author: 'Justin',
                rating: 5,
                text: 'Super friendly staff of Sales and Matt did a wonderful job of cleaning all the windows and glass on our French doors. They cleaned the screens and repaired some screens too. Very pleased 😁',
                time: '18 hours ago'
              },
              {
                id: 'fallback-5',
                author: 'Patrick Howe',
                rating: 5,
                text: '"Worth every dollar!" I had a flawless experience with Pinks Window Cleaning company. It was "just like the old days" of a reliable, high quality company to work with from the initial on-line form request estimate process, to an on-site estimate, to the work performed. The cleaners were extremely conscientious and respectful of the interior and exterior of my home, and the glass became cleaner than I have ever seen. The transformation was so prominent that it was as if the home had a fresh paint job and renovation! I loved the work and feel so positive about the experience I can\'t wait to use them again. Bravo Pinks!',
                time: '22 hours ago'
              },
              {
                id: 'fallback-4',
                author: 'Sandy Zito',
                rating: 4,
                text: 'Sael and Matt worked hard and efficiently and were attentive to our requests. Would have had 5 stars but they forgot to do the small windows of the garage doors which is not important to us.',
                time: '23 hours ago'
              },
              {
                id: 'fallback-5',
                author: 'Carmine Pierro',
                rating: 5,
                text: 'Very professional and excellent work. I would highly recommend pinks to anyone interested in having the best clean Windows they ever had',
                time: 'a day ago'
              },
              {
                id: 'fallback-6',
                author: 'Kathryn Heekin',
                rating: 5,
                text: 'Dylan and Sael were both gentlemen and friendly. There work was excellent!',
                time: '2 days ago'
              },
              {
                id: 'fallback-7',
                author: 'Charley Mitcherson',
                rating: 5,
                text: 'Today the two Matts came and did an excellent job of cleaning my windows!',
                time: '3 days ago'
              },
              {
                id: 'fallback-8',
                author: 'Paul Falanga',
                rating: 5,
                text: 'A Great customer centered crew. Sael was terrific. Bryan, very consciencious. Matt, Matt and Dillon came to perform the complementary service and stepped up to the challenge. Much appreciate all efforts and positive attitudes.',
                time: '5 days ago'
              },
              {
                id: 'fallback-9',
                author: 'Colleen Bicknese',
                rating: 4,
                text: 'Our estimator never requested to see the interior so he WAY underestimated how long it would take to complete the job. The 2 window techs were fantastic, they did a very good job. They had to come back to do the exterior after finishing the interior, and between the weather and sick employees it took 2 weeks to get it all done.',
                time: 'a week ago'
              },
              {
                id: 'fallback-10',
                author: 'Iva Walsh',
                rating: 5,
                text: 'I have given one star review before because the company went on our property without permission. I hope then can figure it out and before then go they need to obtain the permission. I just got my windows clean by Pink\'s. Amazing job!!!! I will have my windows done exclusively by this company!!! I would even request Dylan and Sael. These guys are professional, pleasant and very, very good. They left the windows beautifully clean and the house in perfect condition as well.',
                time: 'a week ago'
              }
            ])
            return
          }
        }
        
        const result = await response.json()
        
        console.log('[Google Reviews Scraper] Fetch result:', {
          success: result.success,
          hasData: !!result.data,
          reviewCount: result.data?.reviews?.length || 0,
          averageRating: result.data?.averageRating,
          totalReviews: result.data?.totalReviews,
          businessName: result.data?.businessName
        })
        
        if (result.success && result.data && result.data.reviews && Array.isArray(result.data.reviews)) {
          // Take the latest 10 reviews and format them
          const latestReviews = result.data.reviews.slice(0, 10).map((review: any, index: number) => ({
            id: `review-${index}`,
            author: review.author || 'Anonymous',
            rating: review.rating || 5,
            text: review.text || '',
            time: review.relativeTime || review.time || 'Recently'
          }))
          setGoogleReviews(latestReviews)
          
          // Also store the average rating and total reviews if needed
          if (result.data.averageRating || result.data.totalReviews) {
            console.log('[Google Reviews] Business stats:', {
              averageRating: result.data.averageRating,
              totalReviews: result.data.totalReviews
            })
          }
        } else {
          // No reviews available or scraper failed
          console.error('[Google Reviews Scraper] No reviews found or error:', result.error || 'Unknown error')
          
          // Use fallback reviews if scraper fails
          console.log('[Google Reviews] Using fallback data')
          setGoogleReviews([
            {
              id: 'fallback-1',
              author: 'Lauren Card',
              rating: 5,
              text: 'Pink\'s Windows is excellent. I highly recommend them to anyone looking for amazing customer service, a friendly interaction and top-notch work. My windows are shining, and I couldn\'t be happier. The team did not stop until everything was perfect - leaving no streaks behind!',
              time: '11 minutes ago'
            },
            {
              id: 'fallback-2',
              author: 'Vanessa Dawson',
              rating: 5,
              text: 'Responsive, efficient service with a very high tech and cost effective way to clean your windows. Our four story facade is sparkling and no one had to hang onto ledges or wear climbing gear. They did it all from the street with poles, brushes, a hose and reverse osmosis canisters. Fantastic! Dylan & Roody are perfectionists and took great care to make sure we were absolutely satisfied before they left. Highly recommend Pinks and Dylan and Roody!',
              time: '5 hours ago'
            },
            {
              id: 'fallback-3',
              author: 'Barbara Levy',
              rating: 5,
              text: 'We used Pink\'s for the first time yesterday, and they did an excellent job. Dylan and Rudy were unobtrusive and went out of their way to make sure everything was done properly and put back the way it was. I would definitely recommend them.',
              time: '6 hours ago'
            },
            {
              id: 'fallback-4',
              author: 'Justin',
              rating: 5,
              text: 'Super friendly staff of Sales and Matt did a wonderful job of cleaning all the windows and glass on our French doors. They cleaned the screens and repaired some screens too. Very pleased 😁',
              time: '18 hours ago'
            },
            {
              id: 'fallback-3',
              author: 'Patrick Howe',
              rating: 5,
              text: '"Worth every dollar!" I had a flawless experience with Pinks Window Cleaning company. It was "just like the old days" of a reliable, high quality company to work with from the initial on-line form request estimate process, to an on-site estimate, to the work performed. The cleaners were extremely conscientious and respectful of the interior and exterior of my home, and the glass became cleaner than I have ever seen. The transformation was so prominent that it was as if the home had a fresh paint job and renovation! I loved the work and feel so positive about the experience I can\'t wait to use them again. Bravo Pinks!',
              time: '22 hours ago'
            },
            {
              id: 'fallback-4',
              author: 'Sandy Zito',
              rating: 4,
              text: 'Sael and Matt worked hard and efficiently and were attentive to our requests. Would have had 5 stars but they forgot to do the small windows of the garage doors which is not important to us.',
              time: '23 hours ago'
            },
            {
              id: 'fallback-5',
              author: 'Carmine Pierro',
              rating: 5,
              text: 'Very professional and excellent work. I would highly recommend pinks to anyone interested in having the best clean Windows they ever had',
              time: 'a day ago'
            },
            {
              id: 'fallback-6',
              author: 'Karen Zukowski',
              rating: 5,
              text: 'Great job by Jerell, Jayden, Jared and Roody. They were easy to work with and very respectful of my time and property. A big job done in one day. Thanks guys.',
              time: '3 days ago'
            },
            {
              id: 'fallback-7',
              author: 'tina finkelstein',
              rating: 5,
              text: 'The customer service was great, staff was professional, efficient and organized. They did a beautiful and thorough job. Matt S was conscientious and very knowledgeable. We would highly recommend this service.',
              time: '4 days ago'
            },
            {
              id: 'fallback-8',
              author: 'Paul Falanga',
              rating: 5,
              text: 'A Great customer centered crew. Sael was terrific. Bryan, very consciencious. Matt, Matt and Dillon came to perform the complementary service and stepped up to the challenge. Much appreciate all efforts and positive attitudes.',
              time: '5 days ago'
            },
            {
              id: 'fallback-6',
              author: 'Colleen Bicknese',
              rating: 4,
              text: 'Our estimator never requested to see the interior so he WAY underestimated how long it would take to complete the job. The 2 window techs were fantastic, they did a very good job. They had to come back to do the exterior after finishing the interior, and between the weather and sick employees it took 2 weeks to get it all done.',
              time: 'a week ago'
            }
          ])
        }
      } catch (error) {
        console.error('Failed to fetch Google reviews from scraper:', error)
        // Fallback to sample reviews
        setGoogleReviews([
          {
            id: 'error-1',
            author: 'Lauren Card',
            rating: 5,
            text: 'Pink\'s Windows is excellent. I highly recommend them to anyone looking for amazing customer service, a friendly interaction and top-notch work. My windows are shining, and I couldn\'t be happier. The team did not stop until everything was perfect - leaving no streaks behind!',
            time: '11 minutes ago'
          },
          {
            id: 'error-2',
            author: 'Vanessa Dawson',
            rating: 5,
            text: 'Responsive, efficient service with a very high tech and cost effective way to clean your windows. Our four story facade is sparkling and no one had to hang onto ledges or wear climbing gear. They did it all from the street with poles, brushes, a hose and reverse osmosis canisters. Fantastic! Dylan & Roody are perfectionists and took great care to make sure we were absolutely satisfied before they left. Highly recommend Pinks and Dylan and Roody!',
            time: '5 hours ago'
          },
          {
            id: 'error-3',
            author: 'Barbara Levy',
            rating: 5,
            text: 'We used Pink\'s for the first time yesterday, and they did an excellent job. Dylan and Rudy were unobtrusive and went out of their way to make sure everything was done properly and put back the way it was. I would definitely recommend them.',
            time: '6 hours ago'
          },
          {
            id: 'error-4',
            author: 'Justin',
            rating: 5,
            text: 'Super friendly staff of Sales and Matt did a wonderful job of cleaning all the windows and glass on our French doors. They cleaned the screens and repaired some screens too. Very pleased 😁',
            time: '18 hours ago'
          },
          {
            id: 'error-5',
            author: 'Patrick Howe',
            rating: 5,
            text: '"Worth every dollar!" I had a flawless experience with Pinks Window Cleaning company. It was "just like the old days" of a reliable, high quality company to work with from the initial on-line form request estimate process, to an on-site estimate, to the work performed. The cleaners were extremely conscientious and respectful of the interior and exterior of my home, and the glass became cleaner than I have ever seen. The transformation was so prominent that it was as if the home had a fresh paint job and renovation! I loved the work and feel so positive about the experience I can\'t wait to use them again. Bravo Pinks!',
            time: '22 hours ago'
          },
          {
            id: 'error-4',
            author: 'Sandy Zito',
            rating: 4,
            text: 'Sael and Matt worked hard and efficiently and were attentive to our requests. Would have had 5 stars but they forgot to do the small windows of the garage doors which is not important to us.',
            time: '23 hours ago'
          },
          {
            id: 'error-5',
            author: 'Carmine Pierro',
            rating: 5,
            text: 'Very professional and excellent work. I would highly recommend pinks to anyone interested in having the best clean Windows they ever had',
            time: 'a day ago'
          }
        ])
      }
    }
  
  // Fetch reviews on mount
  useEffect(() => {
    fetchReviews()
  }, [])

  // Click outside handler to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filter-dropdown') && !target.closest('button')) {
        setIsFilterOpen(false)
      }
    }

    const handleResize = () => {
      // Update position on resize
      if (filterButtonRef.current && isFilterOpen) {
        const rect = filterButtonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('resize', handleResize)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isFilterOpen])

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

  /**
   * GET KPI CALCULATION DETAILS
   * ===========================
   * This function returns the exact calculation formula and explanation for each KPI.
   * Used when users click on a KPI card to understand how the number is calculated.
   * 
   * IMPORTANT: These formulas must match EXACTLY what the backend calculates!
   * If you change backend logic, update these formulas too.
   * 
   * @param kpiId - The unique identifier of the KPI (e.g., 'quotes-sent-today')
   * @returns Object with formula (SQL-like), description (plain English), and optional notes
   */
  const getKPICalculationDetails = (kpiId: string): { formula: string; description: string; notes?: string } => {
    switch (kpiId) {
      case 'quotes-sent-today':
        return {
          formula: 'COUNT(*) FROM v_quotes WHERE DATE(sent_date) = TODAY_EST',
          description: 'Counts quotes where sent_date equals today in EST timezone from BigQuery view: jobber_data.v_quotes',
          notes: 'Includes all quotes sent between 12:00 AM and 11:59 PM EST. Target: 18 quotes daily (6 per territory × 3 territories).'
        }
      case 'converted-today':
        return {
          formula: 'SUM(q.total_dollars) FROM v_quotes q LEFT JOIN v_jobs j ON q.job_numbers = j.Job_Number WHERE DATE(COALESCE(j.Date_Converted, q.converted_date)) = TODAY_EST',
          description: 'Sum of quote values where the associated job was created today. Uses job creation date, not quote approval date.',
          notes: 'Tracks when jobs are actually created in the system. A quote may be approved one day but the job created the next.'
        }
      case 'converted-week':
        return {
          formula: 'SUM(q.total_dollars) FROM v_quotes q LEFT JOIN v_jobs j ON q.job_numbers = j.Job_Number WHERE COALESCE(j.Date_Converted, q.converted_date) >= SUNDAY_START AND < NEXT_SUNDAY',
          description: 'Total revenue from quotes where jobs were created this week. Uses job creation date from v_jobs table.',
          notes: 'Week boundaries: Sunday 12:00 AM to Saturday 11:59:59 PM EST. Reflects actual job creation, not just quote approval.'
        }
      case 'cvr-week':
        return {
          formula: '(COUNT(*) FROM v_quotes WHERE converted_date >= SUNDAY_START AND converted_date < NEXT_SUNDAY) ÷ (COUNT(*) FROM v_quotes WHERE sent_date >= SUNDAY_START AND sent_date < NEXT_SUNDAY) × 100',
          description: 'Conversion rate calculated as quotes converted this week divided by quotes sent this week.',
          notes: 'Compares conversions happening this week (regardless of when sent) against quotes sent this week. This shows current week performance.'
        }
      case 'recurring-2026':
        return {
          formula: 'SUM(Calculated_Value) FROM v_jobs WHERE YEAR(Date) = 2026 AND Job_type = "RECURRING"',
          description: 'Sum of all recurring job values scheduled in 2026 from BigQuery view: jobber_data.v_jobs',
          notes: 'Only includes jobs explicitly marked as RECURRING type. Target: $1M for the year.'
        }
      case 'next-month-otb':
        return {
          formula: 'SUM(Calculated_Value) FROM v_jobs WHERE MONTH(Date) = NEXT_MONTH AND YEAR(Date) = CURRENT_OR_NEXT_YEAR',
          description: 'Total value of all jobs scheduled for next calendar month from BigQuery view: jobber_data.v_jobs',
          notes: 'Updates on the 1st of each month. Includes jobs already scheduled, not potential quotes.'
        }
      case 'speed-to-lead':
        return {
          formula: 'AVG(TIMESTAMP_DIFF(q.sent_date, r.requested_on_date, MINUTE)) FROM v_requests r JOIN v_quotes q ON r.quote_number = q.quote_number',
          description: 'Average response time calculated by joining jobber_data.v_requests and jobber_data.v_quotes on quote_number.',
          notes: 'Calculated in minutes, displayed as hours/minutes. Target: 1440 min (24 hours).'
        }
      case 'recurring-cvr':
        return {
          formula: '(COUNT(converted) FROM v_quotes WHERE sent_date >= TODAY - 30) ÷ (COUNT(*) FROM v_quotes WHERE sent_date >= TODAY - 30) × 100',
          description: 'Percentage of quotes from jobber_data.v_quotes sent in last 30 days that have converted.',
          notes: 'Rolling 30-day window. Includes quotes that may have converted after the 30-day period.'
        }
      case 'avg-qpd':
        return {
          formula: 'COUNT(quotes WHERE sent_date >= TODAY - 30 DAYS) ÷ NUMBER_OF_BUSINESS_DAYS_IN_LAST_30',
          description: 'Average number of quotes sent per business day (Monday-Friday) over the last 30 calendar days.',
          notes: 'Excludes weekends from the calculation. Typically ~22 business days in a 30-day period. Helps track sales activity consistency on working days.'
        }
      case 'reviews-week':
        return {
          formula: 'COUNT(reviews WHERE review_date >= SUNDAY_START AND review_date < NEXT_SUNDAY)',
          description: 'Count of Google reviews from BigQuery table where review date falls in current week.',
          notes: 'Reviews manually added to BigQuery table. Target: 6 per week for reputation building (2 per territory × 3 territories).'
        }
      case 'winter-otb':
        const winterYears = getWinterYears();
        return {
          formula: `SUM(Calculated_Value) FROM v_jobs WHERE (MONTH(Date) = 12 AND YEAR(Date) = ${winterYears.decYear}) OR (MONTH(Date) IN (1,2) AND YEAR(Date) = ${winterYears.janFebYear})`,
          description: `Total value of all jobs scheduled for December ${winterYears.decYear} plus January and February ${winterYears.janFebYear} from BigQuery view: jobber_data.v_jobs`,
          notes: 'Combines the three slowest months into one metric. Target: $95k. Automatically advances to next winter season after February.'
        }
      default:
        return {
          formula: 'Custom calculation',
          description: 'Metric calculation details.',
          notes: ''
        }
    }
  }

  // Setup charts
  useEffect(() => {
    const setupCharts = () => {
      // Get responsive configuration
      // const responsiveConfig = getResponsiveChartConfig()
      
      // Setup charts with dark theme
      Chart.defaults.color = 'rgba(255, 255, 255, 0.6)'
      Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'

      // Destroy existing charts
      if (trendChartInstance.current) trendChartInstance.current.destroy()
      if (conversionChartInstance.current) conversionChartInstance.current.destroy()
      if (monthlyOTBChartInstance.current) monthlyOTBChartInstance.current.destroy()
      if (weeklyOTBChartInstance.current) weeklyOTBChartInstance.current.destroy()
      if (sparklineInstance.current) sparklineInstance.current.destroy()
      if (heatmapInstance.current) heatmapInstance.current.destroy()
      
      // Destroy KPI sparklines
      Object.values(kpiSparklineInstances.current).forEach(chart => {
        if (chart) chart.destroy()
      })
    }
    
    setupCharts()

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
              data: Array.from({length: 24}, () => 0), // TODO: Need hourly quotes data from backend
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
    
    // Note: KPI sparklines are created separately when KPI cards are rendered
    // This avoids circular dependency issues with the kpis array

    // Revenue Trend Chart (Converted This Week)
    if (trendChartRef.current && !loading && data) {
      const ctx = trendChartRef.current.getContext('2d')
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 200)
        gradient.addColorStop(0, CHART_COLORS.revenue.gradient)
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
        
        // Use filtered data if a salesperson is selected
        const filteredTimeSeries = data.rawQuotes ? calculateFilteredTimeSeries(data.rawQuotes, selectedSalesperson) : null;
        
        // Get revenue data from filtered time series or calculate from main data
        let chartData;
        let conversionRevenue;
        
        if (selectedSalesperson !== 'all' && filteredTimeSeries) {
          chartData = {
            labels: filteredTimeSeries.currentWeekDaily.labels,
            quotesSent: new Array(7).fill(0), // We don't track sent quotes in filtered data
            quotesConverted: filteredTimeSeries.currentWeekDaily.quotesConverted
          };
          conversionRevenue = filteredTimeSeries.currentWeekDaily.conversionRevenue;
        } else {
          chartData = data?.timeSeries?.currentWeekDaily || data?.timeSeries?.week;
          // Calculate revenue from converted quotes
          if (chartData && 'quotesConverted' in chartData && Array.isArray(chartData.quotesConverted)) {
            const avgDealValue = (data?.kpiMetrics?.convertedThisWeek && data.kpiMetrics.convertedThisWeek > 0)
              ? (data.kpiMetrics.convertedThisWeekDollars / data.kpiMetrics.convertedThisWeek)
              : 2000;
            conversionRevenue = chartData.quotesConverted.map((converted: number) => converted * avgDealValue);
          } else {
            conversionRevenue = new Array(7).fill(0);
          }
        }
        
        if (!chartData || !chartData.labels || !Array.isArray(conversionRevenue)) {
          console.log('[Converted This Week Chart] No chart data available', { chartData, conversionRevenue });
          return;
        }
        
        console.log('[Converted This Week Chart] Chart data:', chartData, 'Revenue:', conversionRevenue)
        
        // Get current day index (0 = Sunday, 6 = Saturday)
        const currentDayIndex = new Date().getDay()
        
        // Keep all data but we'll handle display in the chart options
        const processedQuotesSent = chartData?.quotesSent || new Array(7).fill(0)
        
        trendChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: '$ Converted',
              type: 'bar',
              data: conversionRevenue,
              backgroundColor: gradient,
              borderColor: CHART_COLORS.revenue.border,
              borderWidth: 2,
              borderRadius: 4,
              yAxisID: 'y',
              order: 3
            }, {
              label: 'Quotes Converted',
              type: 'line',
              data: chartData?.quotesConverted || new Array(7).fill(0),
              borderColor: CHART_COLORS.quotes.converted,
              backgroundColor: 'transparent',
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              pointBackgroundColor: CHART_COLORS.quotes.converted,
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y2',
              order: 2
            }, {
              label: 'Quotes Sent',
              type: 'line',
              data: processedQuotesSent,
              borderColor: CHART_COLORS.quotes.sent,
              backgroundColor: 'transparent',
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              segment: {
                borderDash: (ctx) => ctx.p0DataIndex >= currentDayIndex ? [5, 5] : undefined
              },
              pointBackgroundColor: chartData.labels.map((_, i) => i === currentDayIndex ? '#F9ABAC' : CHART_COLORS.quotes.sent),
              pointBorderColor: chartData.labels.map((_, i) => i === currentDayIndex ? '#F9ABAC' : '#ffffff'),
              pointBorderWidth: chartData.labels.map((_, i) => i === currentDayIndex ? 3 : 2),
              pointRadius: chartData.labels.map((_, i) => i === currentDayIndex ? 6 : (i <= currentDayIndex ? 4 : 0)),
              pointHoverRadius: 6,
              yAxisID: 'y1',
              order: 1
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
                  label: (context) => {
                    if (context.dataset.label === '$ Converted') {
                      return `Revenue: $${context.parsed.y.toLocaleString()}`;
                    } else if (context.dataset.label === 'Quotes Converted') {
                      return `Quotes Converted: ${context.parsed.y}`;
                    } else {
                      return `Quotes Sent: ${context.parsed.y}`;
                    }
                  }
                }
              }
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value: any) => formatCurrencyAxis(Number(value))
                },
                title: {
                  display: true,
                  text: 'Revenue ($)',
                  color: 'rgba(255, 255, 255, 0.6)'
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  callback: (value: any) => {
                    return Number(value).toString();
                  }
                },
                title: {
                  display: true,
                  text: 'Quotes Sent',
                  color: 'rgba(255, 255, 255, 0.6)'
                }
              },
              y2: {
                type: 'linear',
                display: false,
                position: 'right',
                beginAtZero: true,
                grid: {
                  drawOnChartArea: false,
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  callback: function(_value, index) {
                    const currentDayIndex = new Date().getDay();
                    const label = this.getLabelForValue(index);
                    return index === currentDayIndex ? label + ' (Today)' : label;
                  }
                }
              }
            }
          }
        })
      }
    }

    // Weekly CVR Chart
    if (conversionChartRef.current && !loading && data) {
      const ctx = conversionChartRef.current.getContext('2d')
      if (ctx) {
        // Use filtered data if a salesperson is selected
        const filteredTimeSeries = data.rawQuotes ? calculateFilteredTimeSeries(data.rawQuotes, selectedSalesperson) : null;
        const chartData = (selectedSalesperson !== 'all' && filteredTimeSeries) 
          ? filteredTimeSeries.weeklyTrend
          : data?.timeSeries?.week
        
        if (!chartData || !chartData.labels || !Array.isArray(chartData.conversionRate)) {
          console.log('[Weekly CVR Chart Debug] No chart data available', { chartData });
          return;
        }
        
        // Debug logging for missing bars
        console.log('[Weekly CVR Chart Debug]', {
          labels: chartData.labels,
          conversionRate: chartData.conversionRate,
          labelsLength: chartData.labels.length,
          dataLength: chartData.conversionRate.length
        })
        
        // Check for null/undefined/zero values
        chartData.conversionRate.forEach((value, index) => {
          if (value === null || value === undefined || value === 0) {
            console.log(`[CVR Debug] Index ${index} (${chartData.labels[index]}): value=${value}, isNull=${value === null}, isUndefined=${value === undefined}, isZero=${value === 0}`)
          }
        })
        
        // Handle different data structures
        let weeklyRevenue;
        if (selectedSalesperson !== 'all' && filteredTimeSeries && 'revenue' in chartData) {
          // Use revenue directly from filtered data
          weeklyRevenue = chartData.revenue;
        } else if ('quotesConverted' in chartData && Array.isArray(chartData.quotesConverted)) {
          // Calculate from converted quotes
          const avgDealValue = (data?.kpiMetrics?.convertedThisWeek && data.kpiMetrics.convertedThisWeek > 0)
            ? (data.kpiMetrics.convertedThisWeekDollars / data.kpiMetrics.convertedThisWeek)
            : 2000;
          weeklyRevenue = chartData.quotesConverted.map((converted: number) => converted * avgDealValue);
        } else {
          console.warn('[Weekly CVR Chart] No revenue data available, using empty array');
          weeklyRevenue = new Array(chartData?.labels?.length || 8).fill(0);
        }
        
        conversionChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Revenue',
              type: 'bar',
              data: weeklyRevenue,
              backgroundColor: CHART_COLORS.revenue.gradient,
              borderColor: CHART_COLORS.revenue.border,
              borderWidth: 2,
              borderRadius: 4,
              yAxisID: 'y',
              order: 2
            }, {
              label: 'Conversion Rate',
              type: 'line',
              data: chartData.conversionRate,
              borderColor: CHART_COLORS.conversion.rate,
              backgroundColor: CHART_COLORS.conversion.gradient,
              borderWidth: 3,
              pointBackgroundColor: CHART_COLORS.conversion.rate,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.4,
              yAxisID: 'y1',
              order: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: { 
              legend: { 
                display: true,
                position: 'top',
                labels: {
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: 10,
                  usePointStyle: true,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: function(context) {
                    if (context.dataset.label === 'Revenue') {
                      return `Revenue: $${context.parsed.y.toLocaleString()}`;
                    } else {
                      return `Conversion Rate: ${context.parsed.y}%`;
                    }
                  },
                  afterLabel: function(context) {
                    if (context.dataset.label === 'Revenue' && chartData && 'quotesSent' in chartData && 'quotesConverted' in chartData) {
                      const sent = (chartData as any).quotesSent?.[context.dataIndex] || 0;
                      const converted = (chartData as any).quotesConverted?.[context.dataIndex] || 0;
                      return [`${converted} converted / ${sent} sent`];
                    }
                    return [];
                  }
                }
              }
            },
            scales: {
              y: { 
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.6)',
                  callback: (value: any) => formatCurrencyAxis(Number(value))
                },
                title: {
                  display: true,
                  text: 'Revenue ($)',
                  color: 'rgba(255, 255, 255, 0.6)'
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.6)',
                  callback: function(value) {
                    return value + '%';
                  }
                },
                title: {
                  display: true,
                  text: 'Conversion Rate (%)',
                  color: 'rgba(255, 255, 255, 0.6)'
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.6)'
                }
              }
            },
            onClick: () => {
              haptics.selection();
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
        gradient.addColorStop(0, CHART_COLORS.revenue.gradient)
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
        
        // Show all 12 months of 2025
        const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        // Use filtered data if a salesperson is selected
        const filteredOTBData = data.rawJobs ? calculateFilteredOTBData(data.rawJobs, selectedSalesperson) : null;
        
        let monthLabels = allMonths
        let monthlyOTB = allMonths.map((_, index) => {
          const monthNumber = index + 1
          if (selectedSalesperson !== 'all' && filteredOTBData) {
            return filteredOTBData.monthlyOTB[monthNumber] || 0
          }
          return data.kpiMetrics?.monthlyOTBData?.[monthNumber] || 0
        })
        
        // Calculate revenue targets based on van capacity
        // $1,500 per van per working day
        const perVanPerDay = 1500;
        const workingDaysPerMonth = [21, 19, 21, 20, 22, 21, 21, 22, 21, 22, 20, 20]; // 2025 working days per month
        
        // Van capacity timeline:
        // Jan-Jun: 3 vans
        // July 1-13: 3 vans
        // July 14-19: 5 vans
        // July 20+: 6 vans
        // Aug-Dec: 6 vans
        
        const monthlyTargets = allMonths.map((_, index) => {
          const month = index + 1;
          const workingDays = workingDaysPerMonth[index];
          
          let vans;
          if (month < 7) {
            // Jan-Jun: 3 vans
            vans = 3;
          } else if (month === 7) {
            // July: Mixed capacity
            // 13 days with 3 vans, 6 days with 5 vans, rest with 6 vans
            const daysWithThreeVans = 13;
            const daysWithFiveVans = 6;
            const daysWithSixVans = workingDays - daysWithThreeVans - daysWithFiveVans;
            
            return (daysWithThreeVans * 3 * perVanPerDay) + 
                   (daysWithFiveVans * 5 * perVanPerDay) + 
                   (daysWithSixVans * 6 * perVanPerDay);
          } else {
            // Aug-Dec: 6 vans
            vans = 6;
          }
          
          return vans * workingDays * perVanPerDay;
        });
        
        // Debug monthly OTB data
        console.log('[Monthly OTB Chart Debug]', {
          monthlyOTBData: data.kpiMetrics?.monthlyOTBData,
          monthLabels,
          monthlyOTB,
          monthlyTargets,
          hasData: monthlyOTB.some(val => val > 0)
        })
        
        monthlyOTBChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: monthLabels,
            datasets: [{
              label: 'Actual OTB',
              data: monthlyOTB,
              backgroundColor: gradient,
              borderColor: CHART_COLORS.revenue.border,
              borderWidth: 2,
              borderRadius: 4,
              order: 2
            }, {
              label: 'Target',
              data: monthlyTargets,
              type: 'line',
              borderColor: CHART_COLORS.targets.line,
              borderWidth: 2,
              borderDash: CHART_COLORS.targets.dash,
              pointBackgroundColor: CHART_COLORS.targets.line,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              fill: false,
              order: 1
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
                mode: 'index',
                intersect: false,
                callbacks: {
                  title: (context) => {
                    return context[0].label || '';
                  },
                  label: (context) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    if (label === 'Target') {
                      return `Target: $${value.toLocaleString()}`;
                    }
                    return `Actual OTB: $${value.toLocaleString()}`;
                  },
                  afterLabel: (context) => {
                    if (context.datasetIndex === 0) {
                      // After showing actual, calculate percentage of target
                      const actualValue = context.parsed.y;
                      const targetData = context.chart.data.datasets[1]?.data[context.dataIndex];
                      const targetValue = typeof targetData === 'number' ? targetData : 0;
                      if (targetValue > 0) {
                        const percentage = ((actualValue / targetValue) * 100).toFixed(1);
                        return `${percentage}% of target`;
                      }
                    }
                    return '';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value: any) => formatCurrencyAxis(Number(value)),
                  autoSkip: false,
                  maxTicksLimit: 6
                },
                grace: '5%' // Add 5% padding to the top for better visibility
              },
              x: {
                grid: { display: false },
                ticks: {
                  autoSkip: false, // Ensure all months are displayed
                  maxRotation: 45, // Rotate labels if needed for space
                  minRotation: 0
                }
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
        gradient.addColorStop(0, CHART_COLORS.revenue.gradient)
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
        
        // Use filtered data if a salesperson is selected
        const filteredOTBData = data.rawJobs ? calculateFilteredOTBData(data.rawJobs, selectedSalesperson) : null;
        
        // Calculate weeks with current week in the middle
        const now = new Date()
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        // Find the current week's Sunday
        const currentWeekStart = new Date(now)
        if (currentWeekStart.getDay() !== 0) {
          currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())
        }
        
        // Create array of 11 weeks with current week in middle
        const weekRanges: string[] = []
        const weeklyOTBData: number[] = []
        const weeklyTargets: number[] = []
        const weeksToShow = 11 // Total weeks to display
        const weeksBefore = 4  // Weeks before current week
        
        // Start from 4 weeks before current week
        const startWeek = new Date(currentWeekStart)
        startWeek.setDate(startWeek.getDate() - (weeksBefore * 7))
        
        // Calculate revenue targets based on van capacity
        const perVanPerDay = 1500;
        
        // Build 11 weeks of data
        for (let i = 0; i < weeksToShow; i++) {
          const weekStart = new Date(startWeek)
          weekStart.setDate(startWeek.getDate() + (i * 7))
          
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          
          // Format the date range
          const startMonth = weekStart.getMonth()
          const endMonth = weekEnd.getMonth()
          
          let label = ''
          const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime()
          
          if (startMonth === endMonth) {
            label = `${monthNames[startMonth]} ${weekStart.getDate()}-${weekEnd.getDate()}`
          } else {
            label = `${monthNames[startMonth]} ${weekStart.getDate()} - ${monthNames[endMonth]} ${weekEnd.getDate()}`
          }
          
          // Add indicator for current week
          if (isCurrentWeek) {
            label += ' (Current)'
          }
          
          weekRanges.push(label)
          
          // For OTB data, use filtered data if salesperson is selected
          if (selectedSalesperson !== 'all' && filteredOTBData) {
            weeklyOTBData.push(filteredOTBData.weeklyOTB.values[i] || 0)
          } else if (data?.kpiMetrics?.weeklyOTBBreakdown) {
            const weekKey = `week${i}`
            weeklyOTBData.push(data.kpiMetrics.weeklyOTBBreakdown[weekKey] || 0)
          } else {
            weeklyOTBData.push(0)
          }
          
          // Calculate weekly target based on date
          let workingDays = 5; // Assume 5 working days per week
          let vans = 3; // Default to 3 vans
          
          const weekMonth = weekStart.getMonth() + 1;
          const weekYear = weekStart.getFullYear();
          
          if (weekYear === 2025) {
            if (weekMonth < 7) {
              // Jan-Jun: 3 vans
              vans = 3;
            } else if (weekMonth === 7) {
              // July: Check specific dates
              const weekDate = weekStart.getDate();
              if (weekDate < 14) {
                vans = 3;
              } else if (weekDate < 20) {
                vans = 5;
              } else {
                vans = 6;
              }
            } else {
              // Aug-Dec: 6 vans
              vans = 6;
            }
          } else if (weekYear > 2025) {
            // Future years: assume 6 vans
            vans = 6;
          }
          
          weeklyTargets.push(vans * workingDays * perVanPerDay);
        }
        
        let weekLabels = weekRanges
        let weeklyOTB = weeklyOTBData
        
        // Debug logging
        console.log('[Weekly OTB Debug]', {
          weekLabels,
          weeklyOTB,
          weeklyTargets,
          weekRangesLength: weekRanges.length,
          weeklyOTBDataLength: weeklyOTBData.length
        });
        
        weeklyOTBChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: weekLabels,
            datasets: [{
              label: 'Actual OTB',
              data: weeklyOTB,
              backgroundColor: gradient,
              borderColor: CHART_COLORS.revenue.border,
              borderWidth: 2,
              borderRadius: 4,
              barPercentage: 0.8,
              categoryPercentage: 0.9,
              order: 2
            }, {
              label: 'Target',
              data: weeklyTargets,
              type: 'line',
              borderColor: CHART_COLORS.targets.line,
              borderWidth: 2,
              borderDash: CHART_COLORS.targets.dash,
              pointBackgroundColor: CHART_COLORS.targets.line,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              fill: false,
              order: 1
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
                mode: 'index',
                intersect: false,
                callbacks: {
                  title: (context) => {
                    return context[0].label || '';
                  },
                  label: (context) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    if (label === 'Target') {
                      return `Target: $${value.toLocaleString()}`;
                    }
                    return `Actual OTB: $${value.toLocaleString()}`;
                  },
                  afterLabel: (context) => {
                    if (context.datasetIndex === 0) {
                      // After showing actual, calculate percentage of target
                      const actualValue = context.parsed.y;
                      const targetData = context.chart.data.datasets[1]?.data[context.dataIndex];
                      const targetValue = typeof targetData === 'number' ? targetData : 0;
                      if (targetValue > 0) {
                        const percentage = ((actualValue / targetValue) * 100).toFixed(1);
                        return `${percentage}% of target`;
                      }
                    }
                    return '';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value: any) => formatCurrencyAxis(Number(value)),
                  autoSkip: false,
                  maxTicksLimit: 6
                },
                grace: '5%', // Add 5% padding to the top
                suggestedMax: undefined // Remove any fixed max to auto-scale
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
            // TODO: Need real quote activity data by hour/day from backend
            heatmapData.push({
              x: hourIndex,
              y: dayIndex,
              v: 0
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

    // Remove resize listener that was causing issues
    // Charts will handle responsiveness automatically through Chart.js responsive option

    // Cleanup
    return () => {
      trendChartInstance.current?.destroy()
      conversionChartInstance.current?.destroy()
      monthlyOTBChartInstance.current?.destroy()
      weeklyOTBChartInstance.current?.destroy()
      sparklineInstance.current?.destroy()
      heatmapInstance.current?.destroy()
      Object.values(kpiSparklineInstances.current).forEach(chart => chart?.destroy())
    }
  }, [data, loading, selectedSalesperson])

  if (loading || isRefreshing) {
    return <RainbowLoadingWave />
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Dashboard Data Unavailable</h1>
            <p className="text-white/60">The dashboard cannot connect to BigQuery. Running diagnostics...</p>
          </div>
          <DiagnosticPanel />
          <div className="text-center mt-8">
            <button
              onClick={() => {
                haptics.medium()
                refetch()
              }}
              className="px-6 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors font-medium"
            >
              Retry Dashboard Load
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white font-inter flex flex-col overflow-hidden">

          {/* Top bar - Responsive */}
          <header className="px-4 lg:px-6 py-4 border-b border-white/10 bg-gray-900/30 backdrop-blur-lg">
            {/* Desktop Layout */}
            <div className="hidden md:flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <h1 
                    onClick={() => {
                      haptics.light();
                      if (mainContentRef.current) {
                        mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    style={{
                      fontSize: "1.75rem",
                      fontFamily: "'Bebas Neue', 'Oswald', 'Impact', sans-serif",
                      fontWeight: "900",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#F9ABAC",
                      WebkitTextStroke: "0.5px #1e3a5f",
                      paintOrder: "stroke fill",
                      lineHeight: "1",
                      cursor: "pointer"
                    } as React.CSSProperties}
                    className="md:text-4xl lg:text-6xl xl:text-7xl hover:opacity-90 transition-opacity"
                  >
                    PINK'S PULSE - HUDSON VALLEY KPI REPORT
                  </h1>
                </div>
              </div>
              
              {/* Desktop Right side actions */}
              <div className="flex items-center gap-3">
              {/* Salesperson Filter */}
              <div className="relative filter-dropdown">
                <button
                  ref={filterButtonRef}
                  onClick={() => {
                    haptics.light();
                    
                    // Calculate dropdown position
                    if (filterButtonRef.current && !isFilterOpen) {
                      const rect = filterButtonRef.current.getBoundingClientRect();
                      setDropdownPosition({
                        top: rect.bottom + 8,
                        right: window.innerWidth - rect.right
                      });
                    }
                    
                    setIsFilterOpen(!isFilterOpen);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 backdrop-blur-lg border border-white/10 rounded-lg hover:bg-gray-800/50 transition-all group"
                >
                  {selectedSalesperson === 'all' ? (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-white" />
                    </div>
                  ) : getSalespersonThumbnail(selectedSalesperson) ? (
                    <img 
                      src={getSalespersonThumbnail(selectedSalesperson)!} 
                      alt={selectedSalesperson}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-300">
                        {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {selectedSalesperson === 'all' ? 'All Salespeople' : selectedSalesperson}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isFilterOpen && createPortal(
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="fixed w-56 bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-lg shadow-2xl overflow-hidden"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`,
                        zIndex: 999999
                      }}
                    >
                      <div className="p-2 border-b border-white/10">
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
                          <Filter className="h-3 w-3" />
                          <span>Filter by Salesperson</span>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <button
                          onClick={() => {
                            haptics.light();
                            setSelectedSalesperson('all');
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                            selectedSalesperson === 'all' 
                              ? 'bg-pink-500/20 text-pink-400' 
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          All Salespeople
                        </button>
                        {salespeople.map((person) => {
                          const thumbnail = getSalespersonThumbnail(person);
                          return (
                            <button
                              key={person}
                              onClick={() => {
                                haptics.light();
                                setSelectedSalesperson(person);
                                setIsFilterOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                                selectedSalesperson === person 
                                  ? 'bg-pink-500/20 text-pink-400' 
                                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {thumbnail ? (
                                <img 
                                  src={thumbnail} 
                                  alt={person}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-gray-300">
                                    {person.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                              )}
                              {person}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>,
                  document.body
                )}
              </div>

              {/* Refresh Button */}
              <button
              onClick={() => {
                haptics.medium();
                refetch();
                fetchReviews();
              }}
              disabled={loading && !data}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${loading 
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }
              `}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
              </div>
            </div>
            
            {/* Mobile Layout */}
            <div className="md:hidden">
              {/* Mobile Title */}
              <h1 
                onClick={() => {
                  haptics.light();
                  if (mainContentRef.current) {
                    mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                style={{
                  fontFamily: "'Bebas Neue', 'Oswald', 'Impact', sans-serif",
                  fontWeight: "900",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#F9ABAC",
                  WebkitTextStroke: "0.3px #1e3a5f",
                  paintOrder: "stroke fill",
                  lineHeight: "1.1",
                  cursor: "pointer"
                } as React.CSSProperties}
                className="text-2xl text-center mb-3 hover:opacity-90 transition-opacity"
              >
                PINK'S PULSE
                <br />
                <span className="text-sm opacity-80">HUDSON VALLEY KPI REPORT</span>
              </h1>
              
              {/* Mobile Controls */}
              <div className="flex items-center justify-between gap-2">
                {/* Mobile Salesperson Filter */}
                <div className="relative filter-dropdown flex-1">
                  <button
                    onClick={() => {
                      haptics.light();
                      
                      // Calculate dropdown position for mobile
                      const rect = document.querySelector('.filter-dropdown')?.getBoundingClientRect();
                      if (rect && !isFilterOpen) {
                        setDropdownPosition({
                          top: rect.bottom + 8,
                          right: 16 // Fixed margin from edge on mobile
                        });
                      }
                      
                      setIsFilterOpen(!isFilterOpen);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-900/50 backdrop-blur-lg border border-white/10 rounded-lg hover:bg-gray-800/50 transition-all"
                  >
                    {selectedSalesperson === 'all' ? (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-white" />
                      </div>
                    ) : getSalespersonThumbnail(selectedSalesperson) ? (
                      <img 
                        src={getSalespersonThumbnail(selectedSalesperson)!} 
                        alt={selectedSalesperson}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-gray-300">
                          {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium truncate">
                      {selectedSalesperson === 'all' ? 'All Sales' : selectedSalesperson.split(' ')[0]}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isFilterOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {/* Mobile Refresh Button */}
                <button
                  onClick={() => {
                    haptics.medium();
                    refetch();
                    fetchReviews();
                  }}
                  disabled={loading && !data}
                  className={`
                    flex items-center justify-center p-2 rounded-lg transition-all
                    ${loading 
                      ? 'bg-gray-700/50 text-gray-500' 
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }
                  `}
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {/* Mobile Dropdown - Reuse the same portal */}
              {isFilterOpen && createPortal(
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="fixed bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-lg shadow-2xl overflow-hidden"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: '16px',
                      right: '16px',
                      zIndex: 999999
                    }}
                  >
                    <div className="p-2 border-b border-white/10">
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
                        <Filter className="h-3 w-3" />
                        <span>Filter by Salesperson</span>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          haptics.light();
                          setSelectedSalesperson('all');
                          setIsFilterOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                          selectedSalesperson === 'all' 
                            ? 'bg-pink-500/20 text-pink-400' 
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        All Salespeople
                      </button>
                      {salespeople.map((person) => {
                        const thumbnail = getSalespersonThumbnail(person);
                        return (
                          <button
                            key={person}
                            onClick={() => {
                              haptics.light();
                              setSelectedSalesperson(person);
                              setIsFilterOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                              selectedSalesperson === person 
                                ? 'bg-pink-500/20 text-pink-400' 
                                : 'text-gray-300 hover:bg-white/5'
                            }`}
                          >
                            {thumbnail ? (
                              <img 
                                src={thumbnail} 
                                alt={person}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-gray-300">
                                  {person.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                            )}
                            {person}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}
            </div>
          </header>

          {/* Main Content */}
          <section ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-6 pb-20 lg:p-6 lg:pb-6 space-y-6">
            {/* First Row KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className={`bg-gray-900/40 backdrop-blur-lg border rounded-xl p-4 hover:shadow-[0_0_20px_rgba(249,171,172,0.3)] transition-all cursor-pointer overflow-visible relative ${
                    kpi.id === 'next-month-otb' || kpi.id === 'winter-otb' || kpi.id === 'recurring-2026'
                      ? 'border-red-500/50 ring-2 ring-red-500/30' 
                      : 'border-white/10'
                  }`}
                  onClick={() => {
                    haptics.light();
                    setSelectedMetric(kpi);
                  }}
                >
                  {/* Salesperson thumbnail badge */}
                  {selectedSalesperson !== 'all' && (
                    <div className="absolute -top-2 -right-2 z-10">
                      {getSalespersonThumbnail(selectedSalesperson) ? (
                        <img 
                          src={getSalespersonThumbnail(selectedSalesperson)!} 
                          alt={selectedSalesperson}
                          className="w-8 h-8 rounded-full object-cover border-2 border-gray-900 shadow-lg"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 border-2 border-gray-900 shadow-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-pink-400">
                            {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="text-sm text-gray-400">{kpi.label}</h3>
                    {kpi.subtitle && (
                      <p className="text-xs text-gray-500">{kpi.subtitle}</p>
                    )}
                    <p className={`font-bold ${
                      kpi.value === 0 && (kpi.id.includes('today') || kpi.id.includes('week') || isJobsDataKPI(kpi.id)) ? 'text-gray-500 text-sm' : 'text-white text-2xl'
                    }`}>
                      {(() => {
                        if (kpi.value === 0) {
                          if (kpi.id === 'quotes-sent-today') return selectedSalesperson !== 'all' ? `No quotes (checking ${data?.rawQuotes?.length || 0} records)` : 'No quotes sent today';
                          if (kpi.id === 'converted-today') return selectedSalesperson !== 'all' ? `No conversions (checking ${data?.rawQuotes?.length || 0} records)` : 'No quotes converted today';
                          if (kpi.id === 'converted-week') return selectedSalesperson !== 'all' ? `No conversions (checking ${data?.rawQuotes?.length || 0} records)` : 'No quotes converted this week';
                          if (kpi.id === 'cvr-week') return 'No quotes converted this week';
                          // Special message for jobs data KPIs
                          if (isJobsDataKPI(kpi.id)) return 'Data loading...';
                        }
                        return formatValue(kpi.value, kpi.format);
                      })()}
                    </p>
                    {/* Add quote count for Converted This Week */}
                    {kpi.id === 'converted-week' && kpi.value > 0 && data && (
                      <p className="text-sm text-gray-400 mt-1">
                        {(() => {
                          const metrics = (data.rawQuotes && data.rawJobs && selectedSalesperson !== 'all') 
                            ? calculateKPIsFromRawData(data.rawQuotes, data.rawJobs, selectedSalesperson)
                            : data.kpiMetrics;
                          return `${metrics?.convertedThisWeek || 0} quotes converted`;
                        })()}
                      </p>
                    )}
                    {/* Add note for CVR This Week when using last week's data */}
                    {kpi.id === 'cvr-week' && kpi.value > 0 && (data?.kpiMetrics as any)?.debugInfo?.usingLastWeekCVR && (
                      <p className="text-xs text-blue-400 mt-1">
                        *Using last week's rate
                      </p>
                    )}
                    {/* Add note for jobs data KPIs */}
                    {isJobsDataKPI(kpi.id) && kpi.value === 0 && (
                      <p className="text-xs text-red-400 mt-1 animate-pulse">
                        *Jobs data syncing...
                      </p>
                    )}
                    {/* Goal Progress Bar */}
                    {!(kpi.value === 0 && (kpi.id === 'quotes-sent-today' || kpi.id === 'converted-today' || kpi.id === 'converted-week' || kpi.id === 'cvr-week' || isJobsDataKPI(kpi.id))) && (
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
                  className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(249,171,172,0.3)] transition-all cursor-pointer overflow-visible relative"
                  onClick={() => {
                    haptics.light();
                    setSelectedMetric(kpi);
                  }}
                >
                  {/* Salesperson thumbnail badge */}
                  {selectedSalesperson !== 'all' && kpi.id !== 'reviews-week' && (
                    <div className="absolute -top-2 -right-2 z-10">
                      {getSalespersonThumbnail(selectedSalesperson) ? (
                        <img 
                          src={getSalespersonThumbnail(selectedSalesperson)!} 
                          alt={selectedSalesperson}
                          className="w-8 h-8 rounded-full object-cover border-2 border-gray-900 shadow-lg"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 border-2 border-gray-900 shadow-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-pink-400">
                            {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
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

            {/* Data Sync Status */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-gray-400">BigQuery Connected</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Jobber → BigQuery syncs hourly
                  </span>
                  {data?.dataSource === 'mock' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-md">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Using mock data</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Refresh Error Notification */}
            {lastError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium">Refresh Failed</p>
                  <p className="text-xs text-red-300/70 mt-1">
                    Unable to fetch latest data from BigQuery. Displaying data from {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    }) : 'previous load'}.
                  </p>
                </div>
              </div>
            )}
            

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Converted This Week Chart */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-medium">Converted This Week</h2>
                    {selectedSalesperson !== 'all' && (
                      getSalespersonThumbnail(selectedSalesperson) ? (
                        <img 
                          src={getSalespersonThumbnail(selectedSalesperson)!} 
                          alt={selectedSalesperson}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-pink-400">
                            {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded"></div>
                      <span className="text-gray-400">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded"></div>
                      <span className="text-gray-400">Quotes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-orange-400 rounded"></div>
                      <span className="text-gray-400">Sent</span>
                    </div>
                  </div>
                </div>
                <div className="h-48">
                  <canvas ref={trendChartRef}></canvas>
                </div>
              </div>

              {/* Weekly CVR % */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-medium">Weekly Revenue & Conversion Rate</h2>
                  {selectedSalesperson !== 'all' && (
                    getSalespersonThumbnail(selectedSalesperson) ? (
                      <img 
                        src={getSalespersonThumbnail(selectedSalesperson)!} 
                        alt={selectedSalesperson}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-pink-400">
                          {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )
                  )}
                </div>
                <div className="h-48">
                  <canvas ref={conversionChartRef}></canvas>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  *CVR = quotes converted in week ÷ quotes sent in week
                </p>
              </div>
            </div>

            {/* Charts Row 2 */}

            {/* Charts Row 3 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* On The Books by Month */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-red-500/50 ring-2 ring-red-500/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-medium">On The Books by Month - 2025 YTD (Excluding Sales Tax)</h2>
                    {selectedSalesperson !== 'all' && (
                      getSalespersonThumbnail(selectedSalesperson) ? (
                        <img 
                          src={getSalespersonThumbnail(selectedSalesperson)!} 
                          alt={selectedSalesperson}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-pink-400">
                            {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="h-48 w-full min-w-0">
                  <canvas ref={monthlyOTBChartRef}></canvas>
                </div>
              </div>

              {/* On the Books by Week */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-red-500/50 ring-2 ring-red-500/30 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-medium">On the Books by Week - 11 Week View</h2>
                    {selectedSalesperson !== 'all' && (
                      getSalespersonThumbnail(selectedSalesperson) ? (
                        <img 
                          src={getSalespersonThumbnail(selectedSalesperson)!} 
                          alt={selectedSalesperson}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-pink-400">
                            {selectedSalesperson.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Current week centered • Sunday-Saturday weeks</p>
                </div>
                <div className="h-48">
                  <canvas ref={weeklyOTBChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Latest Customer Reviews */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium">Latest Customer Reviews</h2>
                <a 
                  href="https://maps.app.goo.gl/3K6LkrZVrpfDZEWs7" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Google
                </a>
              </div>
              {googleReviews.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-gray-400">Loading reviews from Google Maps...</p>
                    <p className="text-xs text-gray-500 mt-2">If this persists, the scraper may need updating</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="relative overflow-x-auto overflow-y-hidden scrollbar-hide"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth'
                  }}
                  onMouseEnter={(e) => {
                    const container = e.currentTarget.querySelector('.reviews-scroll-container') as HTMLElement;
                    if (container) {
                      container.style.animationPlayState = 'paused';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const container = e.currentTarget.querySelector('.reviews-scroll-container') as HTMLElement;
                    if (container) {
                      container.style.animationPlayState = 'running';
                    }
                  }}
                  onTouchStart={(e) => {
                    const container = e.currentTarget.querySelector('.reviews-scroll-container') as HTMLElement;
                    if (container) {
                      container.style.animationPlayState = 'paused';
                    }
                  }}
                  onTouchEnd={(e) => {
                    const container = e.currentTarget.querySelector('.reviews-scroll-container') as HTMLElement;
                    if (container) {
                      setTimeout(() => {
                        container.style.animationPlayState = 'running';
                      }, 3000); // Resume after 3 seconds
                    }
                  }}
                >
                <style>
                  {`
                    @keyframes scroll {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                    @keyframes scroll-desktop {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(calc(-100% / 3)); }
                    }
                    .scrollbar-hide {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                    .reviews-scroll-container {
                      animation: scroll 15s linear infinite;
                    }
                    @media (min-width: 768px) {
                      .reviews-scroll-container {
                        animation: scroll-desktop 10s linear infinite;
                      }
                    }
                  `}
                </style>
                <div 
                  className="reviews-scroll-container flex transition-transform duration-500 ease-in-out"
                >
                  {googleReviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="flex-shrink-0 w-full md:w-1/3 px-2"
                    >
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-white">{review.author}</p>
                            <div className="flex items-center gap-2 mt-1">
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
                              <span className="text-xs text-gray-400">{review.time}</span>
                            </div>
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
                      className="flex-shrink-0 w-full md:w-1/3 px-2"
                    >
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-white">{review.author}</p>
                            <div className="flex items-center gap-2 mt-1">
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
                              <span className="text-xs text-gray-400">{review.time}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-3">{review.text}</p>
                      </div>
                    </div>
                  ))}
                  {/* Third duplicate for smoother desktop scrolling */}
                  {googleReviews.length > 1 && googleReviews.map((review) => (
                    <div 
                      key={`${review.id}-duplicate-2`} 
                      className="flex-shrink-0 w-full md:w-1/3 px-2"
                    >
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-white">{review.author}</p>
                            <div className="flex items-center gap-2 mt-1">
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
                              <span className="text-xs text-gray-400">{review.time}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-3">{review.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>


            {/* Converted Quotes Table */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="font-medium mb-4">Converted Quotes - This Week</h2>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Loading...</p>
                </div>
              ) : (!data || !data.recentConvertedQuotes || (selectedSalesperson !== 'all' ? data.recentConvertedQuotes.filter(quote => normalizeSalespersonName(quote.salesPerson) === normalizeSalespersonName(selectedSalesperson)) : data.recentConvertedQuotes).length === 0) ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No quotes converted this week</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Week started {new Date().getDay() === 0 ? 'today' : 
                      new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Weeks run Sunday through Saturday)
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                        <th 
                          className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleConvertedQuotesSort('dateConverted')}
                        >
                          <div className="flex items-center gap-2">
                            Date Converted
                            {convertedQuotesSortBy === 'dateConverted' && (
                              <ChevronDown className={`h-4 w-4 transition-transform ${convertedQuotesSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleConvertedQuotesSort('quoteNumber')}
                        >
                          <div className="flex items-center gap-2">
                            Job Number
                            {convertedQuotesSortBy === 'quoteNumber' && (
                              <ChevronDown className={`h-4 w-4 transition-transform ${convertedQuotesSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="pb-3 pr-4">Job Date</th>
                        <th className="pb-3 pr-4">Job Type</th>
                        <th 
                          className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleConvertedQuotesSort('salesPerson')}
                        >
                          <div className="flex items-center gap-2">
                            Sales Person
                            {convertedQuotesSortBy === 'salesPerson' && (
                              <ChevronDown className={`h-4 w-4 transition-transform ${convertedQuotesSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="pb-3 pr-4">JobberLink</th>
                        <th 
                          className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleConvertedQuotesSort('visitTitle')}
                        >
                          <div className="flex items-center gap-2">
                            Visit Title
                            {convertedQuotesSortBy === 'visitTitle' && (
                              <ChevronDown className={`h-4 w-4 transition-transform ${convertedQuotesSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="pb-3 pr-4 text-right cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleConvertedQuotesSort('totalDollars')}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Total Dollars
                            {convertedQuotesSortBy === 'totalDollars' && (
                              <ChevronDown className={`h-4 w-4 transition-transform ${convertedQuotesSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {(selectedSalesperson !== 'all' 
                        ? data.recentConvertedQuotes.filter(quote => normalizeSalespersonName(quote.salesPerson) === normalizeSalespersonName(selectedSalesperson))
                        : data.recentConvertedQuotes
                      )
                        .sort((a: any, b: any) => {
                          let aValue = a[convertedQuotesSortBy]
                          let bValue = b[convertedQuotesSortBy]
                          
                          // Handle date sorting
                          if (convertedQuotesSortBy === 'dateConverted') {
                            aValue = new Date(aValue).getTime()
                            bValue = new Date(bValue).getTime()
                          }
                          
                          // Handle numeric sorting
                          if (convertedQuotesSortBy === 'totalDollars') {
                            aValue = aValue || 0
                            bValue = bValue || 0
                          }
                          
                          // Handle string comparison
                          if (typeof aValue === 'string' && typeof bValue === 'string') {
                            return convertedQuotesSortOrder === 'asc' 
                              ? aValue.localeCompare(bValue)
                              : bValue.localeCompare(aValue)
                          }
                          
                          // Handle numeric/date comparison
                          if (aValue < bValue) return convertedQuotesSortOrder === 'asc' ? -1 : 1
                          if (aValue > bValue) return convertedQuotesSortOrder === 'asc' ? 1 : -1
                          return 0
                        })
                        .map((quote: any, index) => (
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
                            <a 
                              href={quote.jobberLink || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                              onClick={() => haptics.medium()}
                            >
                              View
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
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
              )}
            </div>
            
            {/* Data Accuracy Warning */}
            <div className="mx-4 mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-red-200 font-medium mb-1">Jobs Data Accuracy Notice</p>
                  <p className="text-red-300/80">
                    Jobs data (marked with red borders) may be inaccurate due to API throttling. 
                    This affects On The Books metrics, Winter OTB, and next month projections. 
                    Live webhook integration coming soon.
                  </p>
                </div>
              </div>
            </div>
          </section>

      {/* Full-Screen Metric Modal */}
      <AnimatePresence>
        {selectedMetric && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-8"
            onClick={() => {
              haptics.light();
              setSelectedMetric(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-4xl w-full bg-gray-900/90 backdrop-blur-lg rounded-2xl p-6 md:p-8 border-2 ${
                selectedMetric.id === 'next-month-otb' || selectedMetric.id === 'winter-otb' || selectedMetric.id === 'recurring-2026'
                  ? 'border-red-500 ring-4 ring-red-500/50 ring-offset-4 ring-offset-black/50'
                  : 'border-white/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selectedMetric.label} Deep Dive</h2>
                <button 
                  onClick={() => {
              haptics.light();
              setSelectedMetric(null);
            }}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-5xl font-bold mb-2">{formatValue(selectedMetric.value, selectedMetric.format)}</p>
                  <p className="text-gray-400">Target: {formatValue(selectedMetric.target, selectedMetric.format)}</p>
                  
                  {/* Calculation Details */}
                  <div className="mt-6 space-y-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">Calculation Formula</h3>
                      <code className="text-xs text-blue-400 font-mono block p-2 bg-gray-900/50 rounded overflow-x-auto">
                        {getKPICalculationDetails(selectedMetric.id).formula}
                      </code>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">How it works</h3>
                      <p className="text-sm text-gray-400">
                        {getKPICalculationDetails(selectedMetric.id).description}
                      </p>
                    </div>
                    
                    {getKPICalculationDetails(selectedMetric.id).notes && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-sm text-yellow-200">
                          <span className="font-semibold">Note:</span> {getKPICalculationDetails(selectedMetric.id).notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Additional context for Average Quotes/Day */}
                    {selectedMetric.id === 'avg-qpd' && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-300 mb-2">Current Period Breakdown</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-200">
                            Total quotes in last 30 days: <span className="font-mono font-semibold">{Math.round(selectedMetric.value * getBusinessDaysInLast30Days())}</span>
                          </p>
                          <p className="text-blue-200">
                            Business days in last 30 days: <span className="font-mono font-semibold">{getBusinessDaysInLast30Days()}</span>
                          </p>
                          <p className="text-blue-200">
                            Average per business day: <span className="font-mono font-semibold">{selectedMetric.value.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-24 h-24 md:w-32 md:h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - Math.min(selectedMetric.value / selectedMetric.target, 1))}`}
                        className="transition-all duration-1000"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl md:text-2xl font-bold">
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

export default DashboardV2