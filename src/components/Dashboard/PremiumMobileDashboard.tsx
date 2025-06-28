import React, { useEffect, useRef } from 'react';
import { useKPIData } from '../../hooks/useKPIData';
import { 
  Bell,
  Menu,
  Home,
  Search,
  Layers,
  Bookmark,
  User,
  TrendingUp,
  BarChart3,
  ArrowUp,
  Clock,
  DollarSign,
  Target,
  Activity
} from 'lucide-react';
import Chart from 'chart.js/auto';

const PremiumMobileDashboard: React.FC = () => {
  const { data, loading, error } = useKPIData();
  const performanceChartRef = useRef<HTMLCanvasElement>(null);
  const conversionChartRef = useRef<HTMLCanvasElement>(null);
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Chart[]>([]);

  useEffect(() => {
    if (!data || loading) return;

    // Cleanup previous charts
    chartInstances.current.forEach(chart => chart.destroy());
    chartInstances.current = [];

    // Performance Chart (Doughnut)
    if (performanceChartRef.current) {
      const ctx = performanceChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Converted', 'In Progress', 'Lost'],
            datasets: [{
              data: [
                data.kpis.convertedThisWeek,
                data.kpis.quotesSentToday - data.kpis.convertedToday,
                5 // Estimate
              ],
              backgroundColor: ['#34d399', '#a78bfa', '#22d3ee'],
              borderWidth: 0
            }]
          },
          options: {
            cutout: '75%',
            plugins: { legend: { display: false } },
            maintainAspectRatio: false
          }
        });
        chartInstances.current.push(chart);
      }
    }

    // Conversion Chart (Line)
    if (conversionChartRef.current) {
      const ctx = conversionChartRef.current.getContext('2d');
      if (ctx) {
        const weeklyData = data.kpis.weeklyHistorical || [];
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: weeklyData.map(w => w.weekEnding),
            datasets: [{
              data: weeklyData.map(w => parseFloat(w.cvr)),
              borderColor: '#a78bfa',
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { 
              x: { display: false }, 
              y: { display: false } 
            },
            maintainAspectRatio: false
          }
        });
        chartInstances.current.push(chart);
      }
    }

    // Revenue Chart (Bar)
    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext('2d');
      if (ctx) {
        const weeklyData = data.kpis.weeklyHistorical?.slice(0, 5) || [];
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: weeklyData.map(w => {
              const date = new Date(w.weekEnding);
              return date.toLocaleDateString('en-US', { weekday: 'short' });
            }),
            datasets: [{
              data: weeklyData.map(w => w.converted * 150), // Estimate $150 per conversion
              backgroundColor: ['#a78bfa','#22d3ee','#34d399','#f59e0b','#ef4444'],
              borderRadius: 8,
              barPercentage: 0.6
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              x: { 
                grid: { display: false }, 
                ticks: { color:'#94a3b8', font:{size:11} }
              },
              y: { 
                grid: { display: false }, 
                ticks: { color:'#94a3b8', font:{size:10} }
              }
            },
            maintainAspectRatio: false
          }
        });
        chartInstances.current.push(chart);
      }
    }

    return () => {
      chartInstances.current.forEach(chart => chart.destroy());
    };
  }, [data, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  return (
    <div className="min-h-screen flex items-center justify-center sm:p-6 antialiased overflow-x-auto text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Status Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600/20 backdrop-blur-sm px-4 py-2 text-sm text-yellow-300 text-center z-50">
          {error}
        </div>
      )}
      
      {/* Debug Info Banner */}
      {data?.kpis?._debug && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600/20 backdrop-blur-sm px-4 py-2 text-xs text-blue-300 z-50 overflow-auto max-h-32">
          <details>
            <summary className="cursor-pointer">Debug Info (click to expand)</summary>
            <pre className="mt-2 text-[10px]">
              All-time quotes: {data.kpis._debug.allTimeQuotes}
              All-time converted: {data.kpis._debug.allTimeConverted}
              All-time revenue: {data.kpis._debug.allTimeRevenue}
              Current time: {data.kpis._debug.currentTime}
              Quotes date range: {data.kpis._debug.dateRanges.quotes?.min ? `${new Date(data.kpis._debug.dateRanges.quotes.min).toLocaleDateString()} - ${new Date(data.kpis._debug.dateRanges.quotes.max).toLocaleDateString()}` : 'No dates'}
              Jobs date range: {data.kpis._debug.dateRanges.jobs?.min ? `${new Date(data.kpis._debug.dateRanges.jobs.min).toLocaleDateString()} - ${new Date(data.kpis._debug.dateRanges.jobs.max).toLocaleDateString()}` : 'No dates'}
            </pre>
          </details>
        </div>
      )}

      <div className="flex flex-wrap gap-6 justify-center">
        {/* Phone 1 - Analytics Dashboard */}
        <div className="relative w-80 max-w-full h-[680px] bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 p-5 flex flex-col animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-sm font-semibold text-white">
                P
              </div>
              <div>
                <p className="text-sm font-medium">Pink's Lawn Care</p>
                <p className="text-xs text-slate-400">Sales Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Bell className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-5 overflow-y-auto scrollbar-hide">
            {/* Performance Overview */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 animate-fade-in-up delay-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg tracking-tight">Today's Performance</h3>
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <TrendingUp className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-32 h-32">
                  <canvas ref={performanceChartRef} />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                    <span>{kpis.convertedToday} Converted</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-violet-400"></span>
                    <span>{kpis.quotesSentToday} Quotes Sent</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                    <span>{kpis.convertedAmountToday}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Conversion Metrics */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg tracking-tight">Conversion Rate</h3>
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-end gap-4 mb-4">
                <p className="text-3xl font-semibold tracking-tight">{kpis.cvrThisWeek}</p>
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <ArrowUp className="w-3 h-3" />
                  <span>+2.3%</span>
                </div>
              </div>
              <div className="h-16">
                <canvas ref={conversionChartRef} />
              </div>
              <div className="flex justify-between text-xs mt-3 text-slate-400">
                <span><span className="font-medium text-white">{kpis.convertedThisWeek}</span> Conversions</span>
                <span><span className="font-medium text-white">{kpis.avgQPD30Day}</span> Avg/Day</span>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-5 gap-1">
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-violet-600/20 text-violet-400 transition-colors">
                <Home className="w-5 h-5" />
                <span className="text-[10px]">Dashboard</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Search className="w-5 h-5" />
                <span className="text-[10px]">Explore</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Layers className="w-5 h-5" />
                <span className="text-[10px]">Projects</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Bookmark className="w-5 h-5" />
                <span className="text-[10px]">Saved</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <User className="w-5 h-5" />
                <span className="text-[10px]">Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Phone 2 - Revenue & Metrics */}
        <div className="relative w-80 max-w-full h-[680px] bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 p-5 flex flex-col animate-fade-in-up delay-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-semibold text-slate-900">
                $
              </div>
              <div>
                <p className="text-sm font-medium">Revenue Metrics</p>
                <p className="text-xs text-slate-400">Weekly Performance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Bell className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <h2 className="font-semibold text-xl tracking-tight mb-5">Financial Overview</h2>
            
            {/* Revenue Cards */}
            <div className="space-y-4">
              {/* This Week Revenue */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 animate-fade-in-up delay-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xs font-semibold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium">Weekly Revenue</div>
                </div>
                <p className="text-xs text-slate-400 mb-3">Total converted value</p>
                <p className="text-2xl font-bold mb-4">{kpis.convertedAmountThisWeek}</p>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-4/5 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Target: $100,000</span>
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">+15%</span>
                  </div>
                </div>
              </div>
              
              {/* Monthly Projections */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-xs font-semibold">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium">Monthly Projections</div>
                </div>
                <p className="text-xs text-slate-400 mb-3">Revenue forecast</p>
                <ul className="space-y-2">
                  {kpis.monthlyProjections?.slice(0, 3).map((proj, i) => (
                    <li key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">{proj.month}</span>
                      <span className="font-medium">${(proj.projected / 1000).toFixed(0)}k</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weekly Revenue Chart */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <h3 className="font-medium text-sm mb-4">Weekly Revenue Trend</h3>
                <div className="h-40">
                  <canvas ref={revenueChartRef} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-5 gap-1">
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Home className="w-5 h-5" />
                <span className="text-[10px]">Dashboard</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-violet-600/20 text-violet-400 transition-colors">
                <Activity className="w-5 h-5" />
                <span className="text-[10px]">Revenue</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Target className="w-5 h-5" />
                <span className="text-[10px]">Goals</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <BarChart3 className="w-5 h-5" />
                <span className="text-[10px]">Reports</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <User className="w-5 h-5" />
                <span className="text-[10px]">Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Phone 3 - Metrics & Speed */}
        <div className="relative w-80 max-w-full h-[680px] bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 p-5 flex flex-col animate-fade-in-up delay-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-sm font-semibold text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Performance Metrics</p>
                <p className="text-xs text-slate-400">30-Day Overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Bell className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-5">
            {/* Speed Metrics */}
            <div className="animate-fade-in-up delay-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg tracking-tight">Key Metrics</h3>
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <Clock className="w-4 h-4" />
                </button>
              </div>
              
              {/* Metric Cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">Speed to Lead</span>
                    <span className="text-lg font-semibold">{kpis.speedToLead30Day}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-3/4"></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">30-Day CVR</span>
                    <span className="text-lg font-semibold">{kpis.cvr30Day}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 w-2/3"></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">Avg Quotes/Day</span>
                    <span className="text-lg font-semibold">{kpis.avgQPD30Day}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 w-4/5"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recurring Revenue */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg tracking-tight">2026 Projections</h3>
                <span className="text-xs bg-violet-600/80 px-2.5 py-1 rounded-full">Annual</span>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Recurring Revenue</p>
                    <p className="text-xs text-slate-400">Projected annual</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{kpis.recurringRevenue2026}</p>
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <ArrowUp className="w-3 h-3" />
                  <span>Based on current growth rate</span>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Next Month OTB</p>
                    <p className="text-xs text-slate-400">On the books</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{kpis.nextMonthOTB}</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-5 gap-1">
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Home className="w-5 h-5" />
                <span className="text-[10px]">Dashboard</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Search className="w-5 h-5" />
                <span className="text-[10px]">Explore</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <Layers className="w-5 h-5" />
                <span className="text-[10px]">Projects</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-violet-600/20 text-violet-400 transition-colors">
                <Activity className="w-5 h-5" />
                <span className="text-[10px]">Metrics</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <User className="w-5 h-5" />
                <span className="text-[10px]">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumMobileDashboard;