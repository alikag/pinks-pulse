import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Calendar,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import KPICard from '../KPI/KPICard';
import WeeklyPerformanceChart from '../Charts/WeeklyPerformanceChart';
import MonthlyProjectionsChart from '../Charts/MonthlyProjectionsChart';
import { useKPIData } from '../../hooks/useKPIData';

const ProfessionalDashboard: React.FC = () => {
  const { data, loading, error } = useKPIData();
  const [activeMetricIndex] = useState(0);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Failed to load dashboard'} />;
  }

  const { kpis } = data;
  
  // Check if kpis exists
  if (!kpis) {
    console.error('KPIs data is missing:', data);
    return <ErrorState message="Invalid data format received from server" />;
  }

  // Define KPI metrics with proper formatting and icons
  const kpiMetrics = [
    {
      id: 'quotes-today',
      label: 'Quotes Sent Today',
      value: kpis.quotesSentToday,
      format: 'number' as const,
      icon: <Target className="w-5 h-5 text-accent-info" />,
      status: 'neutral' as const
    },
    {
      id: 'converted-today',
      label: 'Converted Today',
      value: kpis.convertedToday,
      format: 'number' as const,
      icon: <TrendingUp className="w-5 h-5 text-accent-success" />,
      status: kpis.convertedToday > 0 ? 'success' as const : 'neutral' as const
    },
    {
      id: 'revenue-today',
      label: 'Revenue Today',
      value: kpis.convertedAmountToday.replace('$', ''),
      format: 'currency' as const,
      icon: <DollarSign className="w-5 h-5 text-accent-pink" />,
      status: 'neutral' as const
    },
    {
      id: 'converted-week',
      label: 'Converted This Week',
      value: kpis.convertedThisWeek,
      format: 'number' as const,
      icon: <Calendar className="w-5 h-5 text-accent-info" />,
      trend: { value: 12, label: 'vs last week' },
      status: 'success' as const
    },
    {
      id: 'cvr-week',
      label: 'CVR This Week',
      value: parseFloat(kpis.cvrThisWeek),
      format: 'percentage' as const,
      icon: <Activity className="w-5 h-5 text-accent-success" />,
      target: 30,
      status: parseFloat(kpis.cvrThisWeek) >= 25 ? 'success' as const : 'warning' as const
    },
    {
      id: 'revenue-week',
      label: 'Revenue This Week',
      value: kpis.convertedAmountThisWeek.replace('$', '').replace(',', ''),
      format: 'currency' as const,
      icon: <DollarSign className="w-5 h-5 text-accent-pink" />,
      trend: { value: 8.5, label: 'vs last week' },
      status: 'success' as const
    },
    {
      id: 'speed-lead',
      label: '30-Day Speed to Lead',
      value: kpis.speedToLead30Day.replace(' hrs', ''),
      format: 'number' as const,
      icon: <Clock className="w-5 h-5 text-accent-warning" />,
      target: 2,
      status: parseFloat(kpis.speedToLead30Day) <= 2 ? 'success' as const : 'warning' as const
    },
    {
      id: 'cvr-30',
      label: '30-Day CVR',
      value: parseFloat(kpis.cvr30Day),
      format: 'percentage' as const,
      icon: <Target className="w-5 h-5 text-accent-info" />,
      target: 30,
      status: parseFloat(kpis.cvr30Day) >= 28 ? 'success' as const : 'warning' as const
    },
    {
      id: 'qpd-30',
      label: 'Avg Quotes/Day (30d)',
      value: kpis.avgQPD30Day,
      format: 'number' as const,
      icon: <BarChart3 className="w-5 h-5 text-accent-info" />,
      target: 10,
      status: parseFloat(kpis.avgQPD30Day) >= 8 ? 'success' as const : 'warning' as const
    },
    {
      id: 'otb-next',
      label: 'Next Month OTB',
      value: kpis.nextMonthOTB.replace('$', '').replace(',', ''),
      format: 'currency' as const,
      icon: <Calendar className="w-5 h-5 text-accent-pink" />,
      status: 'neutral' as const
    }
  ];

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-dark-background-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-primary dark:bg-dark-background-primary border-b border-border dark:border-dark-border">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-semibold text-foreground-primary dark:text-dark-foreground-primary">
            Sales KPI Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile KPI Cards - Swipeable */}
      <div className="md:hidden">
        <div className="relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            <div className="flex gap-4 px-4 py-4">
              {kpiMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex-none w-[85vw] snap-center"
                >
                  <KPICard {...metric} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Dots indicator */}
          <div className="flex justify-center gap-1.5 pb-4">
            {kpiMetrics.map((_, index) => (
              <button
                key={index}
                className={`transition-all duration-200 rounded-full ${
                  activeMetricIndex === index
                    ? 'w-6 h-1.5 bg-accent-info'
                    : 'w-1.5 h-1.5 bg-border dark:bg-dark-border'
                }`}
                aria-label={`Go to metric ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop KPI Grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-6">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="px-4 md:px-6 pb-6 space-y-6">
        {/* Weekly Performance */}
        <WeeklyPerformanceChart data={kpis.weeklyHistorical} />

        {/* Monthly Projections and OTB */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyProjectionsChart data={kpis.monthlyProjections} />
          
          {/* On The Books Summary */}
          <div className="bg-background-primary dark:bg-dark-background-secondary rounded-xl border border-border dark:border-dark-border p-6">
            <h3 className="text-lg font-semibold text-foreground-primary dark:text-dark-foreground-primary mb-4">
              On The Books Summary
            </h3>
            <div className="space-y-3">
              {kpis.otbByMonth.slice(0, 3).map((month) => (
                <div key={month.month} className="flex justify-between items-center">
                  <span className="text-sm text-foreground-secondary">{month.month}</span>
                  <span className="font-medium text-foreground-primary">
                    ${month.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            {/* 2026 Recurring Revenue */}
            <div className="mt-6 pt-6 border-t border-border dark:border-dark-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground-secondary">
                  2026 Recurring Revenue
                </span>
                <span className="text-xl font-bold text-accent-pink">
                  {kpis.recurringRevenue2026}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton
const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background-secondary dark:bg-dark-background-primary p-4">
    <div className="animate-pulse">
      <div className="h-16 bg-background-primary dark:bg-dark-background-secondary rounded-lg mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-background-primary dark:bg-dark-background-secondary rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// Error state
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-background-secondary dark:bg-dark-background-primary flex items-center justify-center">
    <div className="text-center">
      <BarChart3 className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
      <p className="text-foreground-secondary">{message}</p>
    </div>
  </div>
);

export default ProfessionalDashboard;