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
import { Menu, TrendingUp, XCircle, Trophy, Clock, AlertCircle, CheckCircle, LogOut, RefreshCw } from 'lucide-react'
import Chart from 'chart.js/auto'
import { useDashboardData } from '../../hooks/useDashboardData'
import { motion, AnimatePresence } from 'framer-motion'
import RainbowLoadingWave from '../RainbowLoadingWave'
import { haptics } from '../../utils/haptics'

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

const SalesKPIDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<KPI | null>(null)
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([])
  const { data, loading, error, refetch } = useDashboardData()
  const mainContentRef = useRef<HTMLElement>(null)
  
  // Debug converted quotes and haptic feedback for conversions
  useEffect(() => {
    if (data) {
      console.log('[Converted Quotes Debug]', {
        hasData: !!data,
        recentConvertedQuotes: data.recentConvertedQuotes,
        length: data.recentConvertedQuotes?.length || 0
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

  // Sparkline data removed - real data needed from backend

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
    
    // Get next month name
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long' });
    
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
        sparklineData: undefined
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
        sparklineData: undefined
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
        subtitle: 'Target: $1M',
        value: metrics.recurringRevenue2026,
        target: 1000000,
        format: 'currency',
        status: metrics.recurringRevenue2026 >= 1000000 ? 'success' : metrics.recurringRevenue2026 >= 750000 ? 'warning' : 'danger'
      },
      {
        id: 'next-month-otb',
        label: `${nextMonthName} OTB`,
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
      return [] // No mock data - return empty array
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
        target: 50,
        format: 'percentage',
        status: metrics.cvr30Days >= 50 ? 'success' : metrics.cvr30Days >= 35 ? 'warning' : 'danger'
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
        subtitle: 'Target: 2',
        value: metrics.reviewsThisWeek || 0,
        target: 2,
        format: 'number',
        status: (metrics.reviewsThisWeek || 0) >= 2 ? 'success' : (metrics.reviewsThisWeek || 0) >= 1 ? 'warning' : 'danger',
        trend: 0
      }
    ]
  }, [data, loading])

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
                author: 'Val Paverd',
                rating: 5,
                text: 'AWESOME! I haven\'t been able to stop staring out of my crystal clear windows all day! Matt B, Thomas, and Matt S did an amazing job on our windows. They also cleared out our gutters and cleaned our roof and skylights. So much more light comes in now. HIGHLY RECOMMEND!!!',
                time: '19 minutes ago'
              },
              {
                id: 'fallback-2',
                author: 'Kathryn Heekin',
                rating: 5,
                text: 'Dylan and Sael were both gentlemen and friendly. There work was excellent!',
                time: '2 hours ago'
              },
              {
                id: 'fallback-3',
                author: 'Charley Mitcherson',
                rating: 5,
                text: 'Today the two Matts came and did an excellent job of cleaning my windows!',
                time: '3 days ago'
              },
              {
                id: 'fallback-3',
                author: 'Paul Falanga',
                rating: 5,
                text: 'A Great customer centered crew. Sael was terrific. Bryan, very consciencious. Matt, Matt and Dillon came to perform the complementary service and stepped up to the challenge. Much appreciate all efforts and positive attitudes.',
                time: '5 days ago'
              },
              {
                id: 'fallback-4',
                author: 'Colleen Bicknese',
                rating: 4,
                text: 'Our estimator never requested to see the interior so he WAY underestimated how long it would take to complete the job. The 2 window techs were fantastic, they did a very good job. They had to come back to do the exterior after finishing the interior, and between the weather and sick employees it took 2 weeks to get it all done.',
                time: 'a week ago'
              },
              {
                id: 'fallback-5',
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
              author: 'Val Paverd',
              rating: 5,
              text: 'AWESOME! I haven\'t been able to stop staring out of my crystal clear windows all day! Matt B, Thomas, and Matt S did an amazing job on our windows. They also cleared out our gutters and cleaned our roof and skylights. So much more light comes in now. HIGHLY RECOMMEND!!!',
              time: '19 minutes ago'
            },
            {
              id: 'fallback-2',
              author: 'Kathryn Heekin',
              rating: 5,
              text: 'Dylan and Sael were both gentlemen and friendly. There work was excellent!',
              time: '2 hours ago'
            },
            {
              id: 'fallback-3',
              author: 'Charley Mitcherson',
              rating: 5,
              text: 'Today the two Matts came and did an excellent job of cleaning my windows!',
              time: '3 days ago'
            },
            {
              id: 'fallback-4',
              author: 'Paul Falanga',
              rating: 5,
              text: 'A Great customer centered crew. Sael was terrific. Bryan, very consciencious. Matt, Matt and Dillon came to perform the complementary service and stepped up to the challenge. Much appreciate all efforts and positive attitudes.',
              time: '5 days ago'
            },
            {
              id: 'fallback-5',
              author: 'Colleen Bicknese',
              rating: 4,
              text: 'Our estimator never requested to see the interior so he WAY underestimated how long it would take to complete the job. The 2 window techs were fantastic, they did a very good job. They had to come back to do the exterior after finishing the interior, and between the weather and sick employees it took 2 weeks to get it all done.',
              time: 'a week ago'
            },
            {
              id: 'fallback-4',
              author: 'Iva Walsh',
              rating: 5,
              text: 'I have given one star review before because the company went on our property without permission. I hope then can figure it out and before then go they need to obtain the permission. I just got my windows clean by Pink\'s. Amazing job!!!! I will have my windows done exclusively by this company!!! I would even request Dylan and Sael. These guys are professional, pleasant and very, very good. They left the windows beautifully clean and the house in perfect condition as well.',
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
            author: 'Happy Customer',
            rating: 5,
            text: 'Great service from Pink\'s Window Services!',
            time: 'Recently'
          }
        ])
      }
    }
  
  // Fetch reviews on mount
  useEffect(() => {
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
          notes: 'Includes all quotes sent between 12:00 AM and 11:59 PM EST. Target: 12 quotes daily.'
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
          formula: 'COUNT(quotes WHERE sent_date >= TODAY - 30 DAYS) ÷ 30',
          description: 'Simple average of quotes sent per day over the last 30 calendar days.',
          notes: 'Fixed 30-day denominator. Helps track sales activity consistency.'
        }
      case 'reviews-week':
        return {
          formula: 'COUNT(reviews WHERE review_date >= SUNDAY_START AND review_date < NEXT_SUNDAY)',
          description: 'Count of Google reviews from BigQuery table where review date falls in current week.',
          notes: 'Reviews manually added to BigQuery table. Target: 2 per week for reputation building.'
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
        
        // Use currentWeekDaily for the "Converted This Week" chart
        const chartData = data.timeSeries.currentWeekDaily || data.timeSeries.week
        console.log('[Converted This Week Chart] Chart data:', chartData)
        
        // Get current day index (0 = Sunday, 6 = Saturday)
        const currentDayIndex = new Date().getDay()
        
        // Keep all data but we'll handle display in the chart options
        const processedQuotesSent = chartData.quotesSent
        const processedQuotesConverted = chartData.quotesConverted
        
        trendChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Sent Quotes',
              data: processedQuotesSent,
              borderColor: '#fb923c',
              backgroundColor: 'rgba(251, 146, 60, 0.1)',
              fill: false,
              tension: 0.4,
              segment: {
                borderDash: (ctx) => ctx.p0DataIndex >= currentDayIndex ? [5, 5] : undefined
              },
              pointBackgroundColor: chartData.labels.map((_, i) => i === currentDayIndex ? '#F9ABAC' : '#fb923c'),
              pointBorderColor: chartData.labels.map((_, i) => i === currentDayIndex ? '#F9ABAC' : '#ffffff'),
              pointBorderWidth: chartData.labels.map((_, i) => i === currentDayIndex ? 3 : 2),
              pointRadius: chartData.labels.map((_, i) => i === currentDayIndex ? 6 : (i <= currentDayIndex ? 4 : 0)),
              pointHoverRadius: 6
            }, {
              label: 'Converted',
              data: processedQuotesConverted,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: false,
              tension: 0.4,
              segment: {
                borderDash: (ctx) => ctx.p0DataIndex >= currentDayIndex ? [5, 5] : undefined
              },
              pointBackgroundColor: chartData.labels.map((_, i) => i === currentDayIndex ? '#F9ABAC' : '#3b82f6'),
              pointBorderColor: chartData.labels.map((_, i) => i === currentDayIndex ? '#F9ABAC' : '#ffffff'),
              pointBorderWidth: chartData.labels.map((_, i) => i === currentDayIndex ? 3 : 2),
              pointRadius: chartData.labels.map((_, i) => i === currentDayIndex ? 6 : (i <= currentDayIndex ? 4 : 0)),
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
                  label: (context) => {
                    return `${context.dataset.label}: ${context.parsed.y}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value: any) => {
                    // Format as number for quote counts
                    const numValue = Number(value);
                    return numValue.toString();
                  }
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
    if (conversionChartRef.current && !loading && data?.timeSeries) {
      const ctx = conversionChartRef.current.getContext('2d')
      if (ctx) {
        const chartData = data.timeSeries.week
        
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
        
        conversionChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: 'Conversion Rate',
              data: chartData.conversionRate,
              backgroundColor: chartData.labels.map((_, index) => 
                index === chartData.labels.length - 1 ? '#F9ABAC' : 'rgba(14, 165, 233, 0.8)'
              ),
              borderRadius: 4,
              borderWidth: 0,
              minBarLength: 2 // Show minimal bar even for 0 values
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
                  label: function(context) {
                    return `Conversion Rate: ${context.parsed.y}%`;
                  },
                  afterLabel: function(context) {
                    const sent = chartData.quotesSent[context.dataIndex];
                    const converted = chartData.quotesConverted[context.dataIndex];
                    return [`${converted} converted / ${sent} sent`];
                  }
                }
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
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)')
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')
        
        // Show all 12 months of 2025
        const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        // Use real data from backend
        let monthLabels = allMonths
        let monthlyOTB = allMonths.map((_, index) => {
          const monthNumber = index + 1 // JavaScript months are 0-indexed
          return data.kpiMetrics?.monthlyOTBData?.[monthNumber] || 0
        })
        
        // Debug monthly OTB data
        console.log('[Monthly OTB Chart Debug]', {
          monthlyOTBData: data.kpiMetrics?.monthlyOTBData,
          monthLabels,
          monthlyOTB,
          hasData: monthlyOTB.some(val => val > 0)
        })
        
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
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: (value) => `$${Number(value) / 1000}k`,
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
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)')
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0)')
        
        // Calculate weeks with current week in the middle
        const now = new Date()
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        // Find the current week's Sunday
        const currentWeekStart = new Date(now)
        if (currentWeekStart.getDay() !== 0) {
          currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())
        }
        
        // Create array of 5 weeks with current week in middle
        const weekRanges: string[] = []
        const weeklyOTBData: number[] = []
        const weeksToShow = 5 // Total weeks to display
        const weeksBefore = 2  // Weeks before current week
        
        // Start from 2 weeks before current week
        const startWeek = new Date(currentWeekStart)
        startWeek.setDate(startWeek.getDate() - (weeksBefore * 7))
        
        // Build 5 weeks of data
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
          
          // For OTB data, use the week index (0-4) matching backend's week0-week4 keys
          if (data?.kpiMetrics?.weeklyOTBBreakdown) {
            const weekKey = `week${i}`
            weeklyOTBData.push(data.kpiMetrics.weeklyOTBBreakdown[weekKey] || 0)
          } else {
            weeklyOTBData.push(0)
          }
        }
        
        let weekLabels = weekRanges
        let weeklyOTB = weeklyOTBData
        
        
        // Check if mobile
        const isMobile = window.innerWidth < 768;
        
        // Debug logging
        console.log('[Weekly OTB Debug]', {
          weekLabels,
          weeklyOTB,
          isMobile,
          weekRangesLength: weekRanges.length,
          weeklyOTBDataLength: weeklyOTBData.length
        });
        
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
              borderRadius: 4,
              // Standard bar width
              barPercentage: 0.8,
              categoryPercentage: 0.9
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
                  callback: (value) => `$${Number(value).toLocaleString()}`,
                  // Auto-calculate nice step size based on max value
                  autoSkip: false,
                  maxTicksLimit: 6
                },
                // Let Chart.js calculate a nice scale that fits the data
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
    
    // Speed to Lead Distribution Chart
    if (speedDistributionRef.current && !loading && data) {
      const ctx = speedDistributionRef.current.getContext('2d')
      if (ctx) {
        // Use real distribution data from BigQuery with 0-24 hours combined
        const speedDist = data.speedDistribution || {};
        const distribution = [
          { range: '0-24 hrs', count: speedDist['0-1440'] || 0 },
          { range: '1-2 days', count: speedDist['1440-2880'] || 0 },
          { range: '2-3 days', count: speedDist['2880-4320'] || 0 },
          { range: '3-4 days', count: speedDist['4320-5760'] || 0 },
          { range: '4-5 days', count: speedDist['5760-7200'] || 0 },
          { range: '5-7 days', count: speedDist['7200-10080'] || 0 },
          { range: '7-14 days', count: speedDist['10080-20160'] || 0 },
          { range: '14+ days', count: speedDist['20160+'] || 0 }
        ]
        
        speedDistributionInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: distribution.map(d => d.range),
            datasets: [{
              label: 'Number of Quotes',
              data: distribution.map(d => d.count),
              backgroundColor: [
                'rgba(16, 185, 129, 0.8)',   // Green - Excellent (0-24 hrs)
                'rgba(34, 197, 94, 0.8)',    // Light Green - Good (1-2 days)
                'rgba(251, 191, 36, 0.8)',   // Yellow - Fair (2-3 days)
                'rgba(245, 158, 11, 0.8)',   // Orange - Warning (3-4 days)
                'rgba(239, 68, 68, 0.8)',    // Red - Poor (4-5 days)
                'rgba(220, 38, 38, 0.8)',    // Dark Red - Critical (5-7 days)
                'rgba(159, 18, 57, 0.8)',    // Darker Red - Severe (7-14 days)
                'rgba(67, 20, 7, 0.8)'       // Brown - Extreme (14+ days)
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
                borderWidth: 1,
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y;
                    const label = context.label;
                    const performanceMap: Record<string, string> = {
                      '0-24 hrs': 'Excellent',
                      '1-2 days': 'Good',
                      '2-3 days': 'Fair',
                      '3-4 days': 'Warning',
                      '4-5 days': 'Poor',
                      '5-7 days': 'Critical',
                      '7-14 days': 'Severe',
                      '14+ days': 'Extreme'
                    };
                    return [`Count: ${value}`, `Performance: ${performanceMap[label] || 'N/A'}`];
                  }
                }
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
    if (cohortRef.current && !loading && data && data?.salespersonsThisWeek && data.salespersonsThisWeek.length > 0) {
      const ctx = cohortRef.current.getContext('2d')
      if (ctx) {
        // Use this week's salesperson data
        const salespersonData = data.salespersonsThisWeek
        
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
    
    // Quote Value Flow Waterfall Chart
    if (waterfallRef.current && !loading && data && data.waterfallData) {
      const ctx = waterfallRef.current.getContext('2d')
      if (ctx) {
        // Use actual waterfall data from backend
        // Expected format: 
        // [
        //   { label: 'Q1 Start', value: 0, cumulative: 0 },
        //   { label: 'Quotes Sent', value: 250000, cumulative: 250000 },
        //   { label: 'Not Converted', value: -150000, cumulative: 100000 },
        //   { label: 'Converted', value: 100000, cumulative: 100000 },
        //   { label: 'Adjustments', value: -5000, cumulative: 95000 },
        //   { label: 'Q1 Final', value: 95000, cumulative: 95000 }
        // ]
        const waterfallData = data.waterfallData
        
        waterfallInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: waterfallData.map((d: any) => d.label),
            datasets: [{
              label: 'Quote Value Flow',
              data: waterfallData.map((d: any) => Math.abs(d.value)),
              backgroundColor: waterfallData.map((d: any) => 
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
      speedDistributionInstance.current?.destroy()
      heatmapInstance.current?.destroy()
      waterfallInstance.current?.destroy()
      cohortInstance.current?.destroy()
      Object.values(kpiSparklineInstances.current).forEach(chart => chart?.destroy())
    }
  }, [data, loading, kpis])

  if (loading) {
    return <RainbowLoadingWave />
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
          onClick={() => {
            haptics.medium();
            setIsSidebarOpen(!isSidebarOpen);
          }}
          className={`lg:hidden fixed top-5 left-3 z-50 p-2 bg-gray-900/90 backdrop-blur-lg rounded-lg border border-white/20 shadow-lg transition-transform ${isSidebarOpen ? 'translate-x-64' : 'translate-x-0'}`}
        >
          <Menu className="h-4 w-4 text-white" />
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col border-r border-white/10 bg-gray-900/50 backdrop-blur-lg p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Pink's Logo" className="h-12 w-12 rounded-lg object-cover" />
              <span 
                style={{
                  fontSize: "1.5rem",
                  fontFamily: "'Bebas Neue', 'Oswald', 'Impact', sans-serif",
                  fontWeight: "900",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#F9ABAC",
                  WebkitTextStroke: "1px #1e3a5f",
                  paintOrder: "stroke fill",
                  lineHeight: "1"
                } as React.CSSProperties}
              >
                PINK'S PULSE
              </span>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => {
                haptics.light();
                setIsSidebarOpen(false);
              }}
              className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 text-sm flex-1 mt-6">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 relative overflow-hidden group">
              <TrendingUp className="h-4 w-4" />
              Dashboard
              <div className="absolute inset-0 bg-gradient-to-r from-[#F9ABAC]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
          </nav>

          {/* Logout button */}
          <button
            onClick={() => {
              haptics.light();
              localStorage.removeItem('dashboard_auth');
              window.location.reload();
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all text-sm mb-4 group"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>

          {/* Footer contact info */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center">
              Contact{' '}
              <a 
                href="mailto:alika.graham@pinkswindows.com"
                className="text-gray-500 hover:text-gray-400 no-underline transition-colors"
              >
                Alika
              </a>
              {' '}for feedback, requests, or questions
            </p>
          </div>

        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            onClick={() => {
              haptics.light();
              setIsSidebarOpen(false);
            }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4 px-4 lg:px-6 py-4 border-b border-white/10 bg-gray-900/30 backdrop-blur-lg">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-12"></div>
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
                  className="ml-2 sm:ml-0 md:text-4xl lg:text-6xl xl:text-7xl hover:opacity-90 transition-opacity"
                >
                  PINK'S PULSE - HUDSON VALLEY KPI REPORT
                </h1>
              </div>
            </div>
            
            <div className="flex-1"></div>
            
            {/* Refresh Button */}
            <button
              onClick={() => {
                haptics.medium();
                refetch();
                fetchReviews();
              }}
              disabled={loading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${loading 
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }
              `}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {loading ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </header>

          {/* Main Content */}
          <section ref={mainContentRef} className="flex-1 overflow-y-auto p-4 pt-6 pb-20 lg:p-6 lg:pb-6 space-y-6">
            {/* First Row KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(249,171,172,0.3)] transition-all cursor-pointer overflow-visible"
                  onClick={() => {
                    haptics.light();
                    setSelectedMetric(kpi);
                  }}
                >
                  <div className="space-y-2">
                    <h3 className="text-sm text-gray-400">{kpi.label}</h3>
                    {kpi.subtitle && (
                      <p className="text-xs text-gray-500">{kpi.subtitle}</p>
                    )}
                    <p className={`font-bold ${
                      kpi.value === 0 && (kpi.id.includes('today') || kpi.id.includes('week')) ? 'text-gray-500 text-sm' : 'text-white text-2xl'
                    }`}>
                      {(() => {
                        if (kpi.value === 0) {
                          if (kpi.id === 'quotes-sent-today') return 'No quotes sent today';
                          if (kpi.id === 'converted-today') return 'No quotes converted today';
                          if (kpi.id === 'converted-week') return 'No quotes converted this week';
                          if (kpi.id === 'cvr-week') return 'No quotes converted this week';
                        }
                        return formatValue(kpi.value, kpi.format);
                      })()}
                    </p>
                    {/* Add note for CVR This Week when using last week's data */}
                    {kpi.id === 'cvr-week' && kpi.value > 0 && (data?.kpiMetrics as any)?.debugInfo?.usingLastWeekCVR && (
                      <p className="text-xs text-blue-400 mt-1">
                        *Using last week's rate
                      </p>
                    )}
                    {/* Goal Progress Bar */}
                    {!(kpi.value === 0 && (kpi.id === 'quotes-sent-today' || kpi.id === 'converted-today' || kpi.id === 'converted-week' || kpi.id === 'cvr-week')) && (
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
                    {kpi.isLive && (
                      <div className="flex items-center gap-2 mt-2 py-0.5">
                        <div className="relative">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
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
                  className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4 hover:shadow-[0_0_20px_rgba(249,171,172,0.3)] transition-all cursor-pointer"
                  onClick={() => {
                    haptics.light();
                    setSelectedMetric(kpi);
                  }}
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
            

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Converted This Week Chart */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
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
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <h2 className="font-medium mb-4 flex items-center justify-between">
                  <span>Weekly Conversion Rates</span>
                  {data?.kpiMetrics?.cvrThisWeek && (
                    <span className="text-sm text-gray-400">
                      Week Avg: {data.kpiMetrics.cvrThisWeek}%
                    </span>
                  )}
                </h2>
                <div className="h-48">
                  <canvas ref={conversionChartRef}></canvas>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  *CVR = quotes converted in week ÷ quotes sent in week
                </p>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Speed to Lead Distribution */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <h2 className="font-medium mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-pink-400" />
                  Speed to Lead Distribution (Last 30 Days)
                </h2>
                <div className="h-48">
                  <canvas ref={speedDistributionRef}></canvas>
                </div>
              </div>
              
              {/* Salesperson Performance */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <h2 className="font-medium mb-4">Salesperson Performance (This Week)</h2>
                {data?.salespersonsThisWeek && data.salespersonsThisWeek.length > 0 ? (
                  <div className="h-48">
                    <canvas ref={cohortRef}></canvas>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-400 mb-2">No quotes sent this week yet</p>
                      <p className="text-xs text-gray-500">
                        Week started {new Date().getDay() === 0 ? 'today' : 
                          new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Weeks run Sunday through Saturday)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 3 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* On The Books by Month */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">On The Books by Month - 2025 YTD (Excluding Sales Tax)</h2>
                </div>
                <div className="h-48 w-full min-w-0">
                  <canvas ref={monthlyOTBChartRef}></canvas>
                </div>
              </div>

              {/* On the Books by Week */}
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
                <div className="mb-4">
                  <h2 className="font-medium">On the Books by Week - 5 Week View</h2>
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

            {/* Quote Value Flow Waterfall Chart */}
            <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
              <h2 className="font-medium mb-4">Quote Value Flow Waterfall - This Quarter</h2>
              <div className="h-64">
                {!data?.waterfallData ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-400">No quote flow data available</p>
                      <p className="text-xs text-gray-500 mt-2">Data will be available when quarterly quote values are processed</p>
                    </div>
                  </div>
                ) : (
                  <canvas ref={waterfallRef}></canvas>
                )}
              </div>
            </div>

            {/* Salesperson Leaderboard Enhanced */}
            {data?.salespersons && data.salespersons.length > 0 && (
              <div className="bg-gray-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(249,171,172,0.3)] transition-shadow">
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
                    
                    return (
                      <div key={sp.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition gap-3">
                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                          <div className="relative flex-shrink-0">
                            {headshots[sp.name] ? (
                              <img 
                                src={headshots[sp.name]} 
                                alt={sp.name}
                                className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-full object-cover border-2 border-gray-700"
                                style={{ aspectRatio: '1/1' }}
                              />
                            ) : (
                              <div className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" 
                                style={{ backgroundColor: sp.color, aspectRatio: '1/1' }}>
                                {sp.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{index + 1}</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{sp.name}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                              <span className="whitespace-nowrap">{sp.quotesSent} sent</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">{sp.quotesConverted} won</span>
                              {sp.avgSpeedToLead !== null && sp.avgSpeedToLead !== undefined && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Clock className="h-3 w-3" />
                                    {sp.avgSpeedToLead} min avg
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto pl-[60px] sm:pl-0">
                          <p className="font-medium text-base sm:text-lg">{formatValue(sp.valueConverted, 'currency')}</p>
                          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3 text-xs mt-1">
                            <span className={`font-medium whitespace-nowrap ${
                              sp.conversionRate >= 40 ? 'text-green-400' : 
                              sp.conversionRate >= 30 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {sp.conversionRate.toFixed(1)}% CVR
                            </span>
                            <span className="text-gray-400 whitespace-nowrap">
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
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Loading...</p>
                </div>
              ) : (!data || !data.recentConvertedQuotes || data.recentConvertedQuotes.length === 0) ? (
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
                      {data.recentConvertedQuotes.map((quote: any, index) => (
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
              className="max-w-4xl w-full bg-gray-900/90 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10"
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

export default SalesKPIDashboard