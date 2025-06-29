/**
 * Centralized metrics calculation logic
 */

import { parseDate, parseNumber } from './data-validators.js';

export class MetricsCalculator {
  constructor(referenceDate = new Date()) {
    this.referenceDate = new Date(referenceDate);
    this.referenceDate.setHours(0, 0, 0, 0);
    
    // Get EST current date for week calculations
    const estString = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    this.estToday = new Date(estString);
    this.estToday.setHours(0, 0, 0, 0);
    
    this.metrics = this.initializeMetrics();
  }
  
  initializeMetrics() {
    return {
      // Quote metrics
      quotesToday: 0,
      quotesThisWeek: 0,
      quotes30Days: 0,
      
      // Conversion metrics
      convertedToday: 0,
      convertedTodayDollars: 0,
      convertedThisWeek: 0,
      convertedThisWeekDollars: 0,
      converted30Days: 0,
      
      // For proper CVR calculation
      quotesThisWeekConverted: 0,
      quotes30DaysConverted: 0,
      
      // Speed to lead
      speedToLeadSum: 0,
      speedToLeadCount: 0,
      speedToLeadValues: [], // Store all values for better debugging
      
      // OTB metrics
      thisWeekOTB: 0,
      thisMonthOTB: 0,
      nextMonthOTB: 0,
      weeklyOTBBreakdown: {},
      
      // Other metrics
      recurringRevenue2026: 0,
      
      // Data quality metrics
      dataQuality: {
        totalQuotes: 0,
        validQuotes: 0,
        totalRequests: 0,
        validRequests: 0,
        totalJobs: 0,
        validJobs: 0
      }
    };
  }
  
  // Date helper methods
  isToday(date) {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === this.referenceDate.getTime();
  }
  
  isThisWeek(date) {
    if (!date) return false;
    const d = new Date(date);
    // Sunday-Saturday weeks using EST date
    const weekStart = new Date(this.estToday);
    weekStart.setDate(this.estToday.getDate() - this.estToday.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return d >= weekStart && d < weekEnd;
  }
  
  isThisMonth(date) {
    if (!date) return false;
    const d = new Date(date);
    return d.getMonth() === this.referenceDate.getMonth() && 
           d.getFullYear() === this.referenceDate.getFullYear();
  }
  
  isNextMonth(date) {
    if (!date) return false;
    const d = new Date(date);
    const nextMonth = new Date(this.referenceDate);
    nextMonth.setMonth(this.referenceDate.getMonth() + 1);
    return d.getMonth() === nextMonth.getMonth() && 
           d.getFullYear() === nextMonth.getFullYear();
  }
  
  isLast30Days(date) {
    if (!date) return false;
    const d = new Date(date);
    const thirtyDaysAgo = new Date(this.referenceDate);
    thirtyDaysAgo.setDate(this.referenceDate.getDate() - 30);
    return d >= thirtyDaysAgo && d <= this.referenceDate;
  }
  
  // Process quotes
  processQuote(quote) {
    this.metrics.dataQuality.totalQuotes++;
    
    const sentDate = quote.sent_date;
    const convertedDate = quote.converted_date;
    const totalDollars = quote.total_dollars;
    const isConverted = quote.status === 'Converted' || quote.status === 'converted';
    
    if (!sentDate) return;
    
    this.metrics.dataQuality.validQuotes++;
    
    // Count sent quotes
    if (this.isToday(sentDate)) {
      this.metrics.quotesToday++;
    }
    if (this.isThisWeek(sentDate)) {
      this.metrics.quotesThisWeek++;
      if (isConverted) {
        this.metrics.quotesThisWeekConverted++;
      }
    }
    if (this.isLast30Days(sentDate)) {
      this.metrics.quotes30Days++;
      if (isConverted) {
        this.metrics.quotes30DaysConverted++;
      }
    }
    
    // Count conversions by conversion date
    if (convertedDate && isConverted) {
      if (this.isToday(convertedDate)) {
        this.metrics.convertedToday++;
        this.metrics.convertedTodayDollars += totalDollars;
      }
      if (this.isThisWeek(convertedDate)) {
        this.metrics.convertedThisWeek++;
        this.metrics.convertedThisWeekDollars += totalDollars;
      }
      if (this.isLast30Days(convertedDate)) {
        this.metrics.converted30Days++;
      }
    }
  }
  
  // Process requests for speed to lead
  processRequest(request) {
    this.metrics.dataQuality.totalRequests++;
    
    const requestDate = request.requested_on_date;
    const minutesToQuote = request.minutes_to_quote_sent;
    
    if (!requestDate) return;
    
    this.metrics.dataQuality.validRequests++;
    
    // Only count valid speed to lead values
    if (this.isLast30Days(requestDate) && 
        minutesToQuote !== null && 
        minutesToQuote !== undefined && 
        minutesToQuote >= 0 && 
        minutesToQuote < 10080) { // Exclude values > 1 week (likely errors)
      
      this.metrics.speedToLeadSum += minutesToQuote;
      this.metrics.speedToLeadCount++;
      this.metrics.speedToLeadValues.push({
        date: requestDate,
        minutes: minutesToQuote
      });
    }
  }
  
  // Process jobs for OTB
  processJob(job) {
    this.metrics.dataQuality.totalJobs++;
    
    const jobDate = job.date;
    const jobValue = job.calculated_value;
    
    if (!jobDate || !jobValue) return;
    
    this.metrics.dataQuality.validJobs++;
    
    if (this.isThisWeek(jobDate)) {
      this.metrics.thisWeekOTB += jobValue;
    }
    
    if (this.isThisMonth(jobDate)) {
      this.metrics.thisMonthOTB += jobValue;
      
      // Calculate week of month (1-5)
      const weekOfMonth = Math.ceil(jobDate.getDate() / 7);
      const weekKey = `week${weekOfMonth}`;
      if (!this.metrics.weeklyOTBBreakdown[weekKey]) {
        this.metrics.weeklyOTBBreakdown[weekKey] = 0;
      }
      this.metrics.weeklyOTBBreakdown[weekKey] += jobValue;
    }
    
    if (this.isNextMonth(jobDate)) {
      this.metrics.nextMonthOTB += jobValue;
    }
    
    // Check for 2026 recurring revenue
    if (jobDate.getFullYear() === 2026 && job.job_type === 'RECURRING') {
      this.metrics.recurringRevenue2026 += jobValue;
    }
  }
  
  // Calculate final metrics
  calculateFinalMetrics() {
    const speedToLead30Days = this.metrics.speedToLeadCount > 0 
      ? Math.round(this.metrics.speedToLeadSum / this.metrics.speedToLeadCount)
      : 0;
    
    const cvrThisWeek = this.metrics.quotesThisWeek > 0
      ? parseFloat(((this.metrics.quotesThisWeekConverted / this.metrics.quotesThisWeek) * 100).toFixed(1))
      : 0;
    
    const cvr30Days = this.metrics.quotes30Days > 0
      ? parseFloat(((this.metrics.quotes30DaysConverted / this.metrics.quotes30Days) * 100).toFixed(1))
      : 0;
    
    const avgQPD = parseFloat((this.metrics.quotes30Days / 30).toFixed(2));
    
    console.log('Speed to Lead Calculation:', {
      count: this.metrics.speedToLeadCount,
      sum: this.metrics.speedToLeadSum,
      average: speedToLead30Days,
      sampleValues: this.metrics.speedToLeadValues.slice(0, 5)
    });
    
    return {
      quotesToday: this.metrics.quotesToday,
      convertedToday: this.metrics.convertedToday,
      convertedTodayDollars: this.metrics.convertedTodayDollars,
      quotesThisWeek: this.metrics.quotesThisWeek,
      convertedThisWeek: this.metrics.convertedThisWeek,
      convertedThisWeekDollars: this.metrics.convertedThisWeekDollars,
      cvrThisWeek,
      quotes30Days: this.metrics.quotes30Days,
      converted30Days: this.metrics.converted30Days,
      cvr30Days,
      avgQPD,
      speedToLead30Days,
      recurringRevenue2026: this.metrics.recurringRevenue2026,
      nextMonthOTB: this.metrics.nextMonthOTB,
      thisMonthOTB: this.metrics.thisMonthOTB,
      thisWeekOTB: this.metrics.thisWeekOTB,
      weeklyOTBBreakdown: this.metrics.weeklyOTBBreakdown,
      dataQuality: this.metrics.dataQuality
    };
  }
}