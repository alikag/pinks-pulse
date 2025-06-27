import React, { useEffect, useRef, useState } from 'react';
import { useKPIData } from '../../hooks/useKPIData';
import { 
  ArrowUp, 
  ArrowDown, 
  Home,
  Activity,
  Users,
  Settings,
  Moon,
  Sun
} from 'lucide-react';
import Chart from 'chart.js/auto';

const ModernKPIDashboard: React.FC = () => {
  const { data, loading } = useKPIData();
  const [isDark, setIsDark] = useState(false);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const areaChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);
  const areaChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    // Apply theme class
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDark]);

  useEffect(() => {
    if (!data || loading) return;

    // Initialize charts
    if (barChartRef.current && !barChartInstance.current) {
      const ctx = barChartRef.current.getContext('2d');
      if (ctx) {
        // Process weekly data for bar chart
        const weeklyData = data.kpis.weeklyHistorical || [];
        const labels = weeklyData.map(w => {
          const date = new Date(w.weekEnding);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const revenues = weeklyData.map(w => w.converted * 150); // Estimate $150 per conversion

        barChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Revenue',
              data: revenues,
              backgroundColor: '#EC4899',
              borderRadius: 6,
              maxBarThickness: 36
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E5E7EB',
                borderWidth: 1,
                titleColor: isDark ? '#F9FAFB' : '#111827',
                bodyColor: isDark ? '#F9FAFB' : '#111827',
                callbacks: {
                  label: (context) => `Revenue: $${context.parsed.y.toLocaleString()}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: isDark ? '#E5E7EB' : '#6B7280', font: { family: 'Inter', size: 12 } }
              },
              y: {
                grid: { color: isDark ? '#334155' : '#E5E7EB' },
                ticks: { color: isDark ? '#E5E7EB' : '#6B7280', font: { family: 'Inter', size: 12 } }
              }
            }
          }
        });
      }
    }

    if (areaChartRef.current && !areaChartInstance.current) {
      const ctx = areaChartRef.current.getContext('2d');
      if (ctx) {
        // Process historical trend data
        const weeklyData = data.kpis.weeklyHistorical || [];
        const conversions = weeklyData.map(w => w.converted);

        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.02)');

        areaChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: weeklyData.map((_, i) => `W${i + 1}`),
            datasets: [{
              data: conversions,
              fill: true,
              backgroundColor: gradient,
              borderColor: '#EC4899',
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E5E7EB',
                borderWidth: 1,
                titleColor: isDark ? '#F9FAFB' : '#111827',
                bodyColor: isDark ? '#F9FAFB' : '#111827'
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: isDark ? '#E5E7EB' : '#6B7280', font: { family: 'Inter', size: 12 } }
              },
              y: {
                grid: { color: isDark ? '#334155' : '#E5E7EB' },
                ticks: { color: isDark ? '#E5E7EB' : '#6B7280', font: { family: 'Inter', size: 12 } }
              }
            }
          }
        });
      }
    }

    // Update chart colors when theme changes
    return () => {
      // Cleanup charts on unmount
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
        barChartInstance.current = null;
      }
      if (areaChartInstance.current) {
        areaChartInstance.current.destroy();
        areaChartInstance.current = null;
      }
    };
  }, [data, loading, isDark]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  // KPI Cards data
  const kpiCards = [
    {
      title: 'Quotes Sent',
      value: kpis.quotesSentToday,
      target: 50,
      progress: (kpis.quotesSentToday / 50) * 100,
      trend: '+15%',
      trendUp: true,
      accentColor: 'success'
    },
    {
      title: 'Conversions',
      value: kpis.convertedToday,
      target: 10,
      progress: (kpis.convertedToday / 10) * 100,
      trend: '+8%',
      trendUp: true,
      accentColor: 'primary'
    },
    {
      title: 'Revenue Today',
      value: kpis.convertedAmountToday,
      target: '$5,000',
      progress: 75,
      trend: '-5%',
      trendUp: false,
      accentColor: 'warning'
    },
    {
      title: 'Weekly CVR',
      value: kpis.cvrThisWeek,
      target: '30%',
      progress: parseFloat(kpis.cvrThisWeek),
      trend: '+12%',
      trendUp: true,
      accentColor: 'success'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'dark' : ''}`}>
      <style>{`
        :root {
          --bg-primary: #FFFFFF;
          --bg-secondary: #F9FAFB;
          --bg-card: #FFFFFF;
          --text-primary: #111827;
          --text-secondary: #6B7280;
          --text-muted: #9CA3AF;
          --accent-primary: #EC4899;
          --accent-success: #10B981;
          --accent-warning: #F59E0B;
          --accent-danger: #EF4444;
          --border: #E5E7EB;
          --shadow: rgba(0,0,0,0.05);
        }
        [data-theme="dark"] {
          --bg-primary: #0F172A;
          --bg-secondary: #1E293B;
          --bg-card: #1E293B;
          --text-primary: #F9FAFB;
          --text-secondary: #E5E7EB;
          --text-muted: #9CA3AF;
          --accent-primary: #F472B6;
          --accent-success: #34D399;
          --accent-warning: #FBBF24;
          --accent-danger: #F87171;
          --border: #334155;
          --shadow: rgba(0,0,0,0.25);
        }
        body {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .fade-in { 
          animation: fadeIn 0.55s forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 lg:px-8 py-4 flex items-center justify-between fade-in">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Sales Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDark(!isDark)}
            className="h-10 w-10 rounded-md border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-secondary)] transition"
          >
            {isDark ? <Sun className="w-5 h-5 text-[var(--text-secondary)]" /> : <Moon className="w-5 h-5 text-[var(--text-secondary)]" />}
          </button>
        </div>
      </header>

      {/* Mobile KPI Swipe */}
      <section className="md:hidden mt-6 overflow-x-auto no-scrollbar fade-in">
        <div className="flex gap-4 px-4 pb-4 snap-x snap-mandatory">
          {kpiCards.map((kpi, index) => (
            <KPICard key={index} {...kpi} mobile />
          ))}
        </div>
      </section>

      {/* Desktop KPI Grid */}
      <section className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 fade-in">
        {kpiCards.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 fade-in mb-20 md:mb-0">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-sm font-medium mb-4">Weekly Performance</h3>
          <div className="h-[200px]">
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-sm font-medium mb-4">Historical Trends</h3>
          <div className="h-[200px]">
            <canvas ref={areaChartRef}></canvas>
          </div>
        </div>
      </section>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="grid grid-cols-4">
          <button className="py-3 flex flex-col items-center text-[var(--accent-primary)]">
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button className="py-3 flex flex-col items-center text-[var(--text-secondary)]">
            <Activity className="w-5 h-5 mb-1" />
            <span className="text-xs">Pipeline</span>
          </button>
          <button className="py-3 flex flex-col items-center text-[var(--text-secondary)]">
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs">Leads</span>
          </button>
          <button className="py-3 flex flex-col items-center text-[var(--text-secondary)]">
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

const KPICard: React.FC<{
  title: string;
  value: string | number;
  target: string | number;
  progress: number;
  trend: string;
  trendUp: boolean;
  accentColor: string;
  mobile?: boolean;
}> = ({ title, value, target, progress, trend, trendUp, accentColor, mobile }) => {
  const accentColors = {
    primary: 'var(--accent-primary)',
    success: 'var(--accent-success)',
    warning: 'var(--accent-warning)',
    danger: 'var(--accent-danger)'
  };

  return (
    <div className={`${mobile ? 'snap-center flex-none w-[85vw]' : ''}`}>
      <div className="relative bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition p-6">
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ backgroundColor: accentColors[accentColor as keyof typeof accentColors] }}
        />

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
            <p className="text-3xl font-semibold text-[var(--text-primary)] mt-1">{value}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Target</p>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{target}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
            <div 
              className="h-full bg-[var(--accent-primary)]" 
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">vs yesterday</span>
          <div className="flex items-center gap-1">
            {trendUp ? (
              <ArrowUp className="w-3 h-3 text-[var(--accent-success)]" />
            ) : (
              <ArrowDown className="w-3 h-3 text-[var(--accent-danger)]" />
            )}
            <span className={`text-xs font-medium ${trendUp ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>
              {trend}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernKPIDashboard;