export interface KPIData {
  kpis: {
    // Daily metrics
    quotesSentToday: number;
    convertedToday: number;
    convertedAmountToday: string;
    
    // Weekly metrics
    convertedThisWeek: number;
    cvrThisWeek: string;
    convertedAmountThisWeek: string;
    
    // 30-day metrics
    speedToLead30Day: string;
    cvr30Day: string;
    avgQPD30Day: string;
    
    // Revenue metrics
    recurringRevenue2026: string;
    nextMonthOTB: string;
    
    // Historical data for charts
    weeklyHistorical: WeeklyHistorical[];
    otbByMonth: MonthlyOTB[];
    otbByWeek: WeeklyOTB[];
    monthlyProjections: MonthlyProjection[];
    
    // Debug info (optional)
    _debug?: {
      allTimeQuotes: number;
      allTimeConverted: number;
      allTimeRevenue: string;
      dateRanges: {
        quotes: { min: string | null; max: string | null } | null;
        jobs: { min: string | null; max: string | null } | null;
      };
      currentTime: string;
      todayBounds: {
        start: string;
        end: string;
      };
    };
  };
  lastUpdated: Date;
}

export interface WeeklyHistorical {
  weekEnding: string;
  sent: number;
  converted: number;
  cvr: string;
}

export interface MonthlyOTB {
  month: string;
  amount: number;
}

export interface WeeklyOTB {
  weekStart: string;
  amount: number;
}

export interface MonthlyProjection {
  month: string;
  projected: number;
  confidence: 'low' | 'medium' | 'high';
}