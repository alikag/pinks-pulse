export interface TimeSeriesData {
  labels: string[];
  quotesSent: number[];
  quotesConverted: number[];
  conversionRate: number[];
  totalSent: number;
  totalConverted: number;
  avgConversionRate: string;
  conversionChange: string;
  period: string;
}

export interface SalespersonData {
  name: string;
  quotesSent: number;
  quotesConverted: number;
  conversionRate: number;
  valueSent: number;
  valueConverted: number;
  color: string;
  avgSpeedToLead?: number | null;
}

export type TimePeriod = 'week' | 'month' | 'year' | 'all';

export interface DashboardData {
  timeSeries: Record<TimePeriod, TimeSeriesData> & {
    currentWeekDaily?: TimeSeriesData;
  };
  salespersons: SalespersonData[];
  salespersonsThisWeek?: SalespersonData[];
  kpiMetrics?: {
    quotesToday: number;
    convertedToday: number;
    convertedTodayDollars: number;
    quotesThisWeek: number;
    convertedThisWeek: number;
    convertedThisWeekDollars: number;
    cvrThisWeek: number;
    quotes30Days: number;
    converted30Days: number;
    cvr30Days: number;
    avgQPD: number;
    speedToLead30Days: number;
    recurringRevenue2026: number;
    nextMonthOTB: number;
    thisMonthOTB: number;
    thisWeekOTB: number;
    weeklyOTBBreakdown?: Record<string, number>;
    monthlyOTBData?: Record<number, number>;
    reviewsThisWeek: number;
    dataQuality?: {
      totalQuotes: number;
      validQuotes: number;
      totalRequests: number;
      validRequests: number;
      totalJobs: number;
      validJobs: number;
    };
  };
  speedDistribution?: Record<string, number>;
  waterfallData?: Array<{
    label: string;
    value: number;
    cumulative: number;
  }>;
  recentConvertedQuotes?: Array<{
    dateConverted: string;
    quoteNumber: string;
    clientName: string;
    salesPerson: string;
    totalDollars: number;
    status: string;
  }>;
  rawQuotes?: Array<{
    quote_number: string;
    salesperson: string;
    sent_date: string;
    converted_date: string;
    total_dollars: number;
    status: string;
    client_name: string;
    job_numbers?: string;
  }>;
  rawJobs?: Array<{
    job_number: string;
    salesperson: string;
    date: string;
    date_converted: string;
    job_type: string;
    calculated_value: number;
  }>;
  lastUpdated: Date;
  dataSource?: string;
  debug?: {
    jobberQuotes: Array<{
      quote_number: string;
      client_name: string;
      raw_converted_date: any;
      parsed_converted_date?: string;
      convertedDate_EST?: string;
      convertedDate_full_EST?: string;
      isToday_result: boolean;
      isThisWeek_result: boolean;
      estToday_EST: string;
    }>;
    estToday: string;
    currentESTTime: string;
    getESTOffset: string;
  };
}

export interface QuoteData {
  report_type: string;
  period: string;
  quotes_sent: number | null;
  quotes_converted: number | null;
  conversion_rate: number | null;
  value_sent: number | null;
  value_converted: number | null;
  salespersons: string;
}