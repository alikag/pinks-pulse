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
}

export type TimePeriod = 'week' | 'month' | 'year' | 'all';

export interface DashboardData {
  timeSeries: Record<TimePeriod, TimeSeriesData>;
  salespersons: SalespersonData[];
  lastUpdated: Date;
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