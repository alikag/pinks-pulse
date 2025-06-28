import React, { useEffect, useRef } from 'react';
import { useKPIData } from '../../hooks/useKPIData';
import { 
  Menu,
  Bell,
  HelpCircle,
  Plus,
  LayoutDashboard,
  TrendingUp,
  Radio,
  FileAudio,
  Users,
  SlidersHorizontal,
  Music,
  HardDrive,
  Activity,
  DollarSign,
  MoreHorizontal,
  Circle,
  Waveform
} from 'lucide-react';
import Chart from 'chart.js/auto';

const ProfessionalDashboard: React.FC = () => {
  const { data, loading, error } = useKPIData();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  // Chart refs
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const conversionChartRef = useRef<HTMLCanvasElement>(null);
  const weeklyChartRef = useRef<HTMLCanvasElement>(null);
  const speedChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Chart[]>([]);

  useEffect(() => {
    if (!data || loading) return;

    // Cleanup previous charts
    chartInstances.current.forEach(chart => chart.destroy());
    chartInstances.current = [];

    // Set chart defaults
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    // Monthly Revenue Chart
    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'This Week'],
            datasets: [{
              label: 'Revenue',
              data: [
                45000,
                52000,
                48000,
                61000,
                parseInt(data.kpis.convertedAmountThisWeek.replace(/[^0-9]/g, '')) || 0
              ],
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#06b6d4',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4
            }, {
              label: 'Target',
              data: [50000, 50000, 50000, 50000, 50000],
              borderColor: 'rgba(139, 92, 246, 0.5)',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              pointRadius: 0,
              tension: 0.2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: { usePointStyle: true, padding: 20 }
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                ticks: {
                  callback: function(value) {
                    return '$' + (Number(value) / 1000).toFixed(0) + 'k';
                  }
                }
              }
            }
          }
        });
        chartInstances.current.push(chart);
      }
    }

    // Conversion Distribution
    if (conversionChartRef.current) {
      const ctx = conversionChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Converted', 'Pending', 'Lost'],
            datasets: [{
              data: [
                data.kpis.convertedThisWeek,
                Math.max(0, data.kpis.quotesSentToday - data.kpis.convertedToday - 2),
                2
              ],
              backgroundColor: ['#3b82f6', '#06b6d4', '#8b5cf6'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { padding: 20, usePointStyle: true }
              }
            }
          }
        });
        chartInstances.current.push(chart);
      }
    }

    // Weekly Performance Chart
    if (weeklyChartRef.current) {
      const ctx = weeklyChartRef.current.getContext('2d');
      if (ctx) {
        const weeklyData = data.kpis.weeklyHistorical || [];
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: weeklyData.map(w => {
              const date = new Date(w.weekEnding);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
              data: weeklyData.map(w => w.converted),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
        chartInstances.current.push(chart);
      }
    }

    // Speed to Lead Chart (Frequency spectrum style)
    if (speedChartRef.current) {
      const ctx = speedChartRef.current.getContext('2d');
      if (ctx) {
        const speedHours = parseFloat(data.kpis.speedToLead30Day) || 0;
        const speedData = [
          { label: '< 1hr', value: speedHours < 1 ? 100 : 0 },
          { label: '1-2hr', value: speedHours >= 1 && speedHours < 2 ? 100 : 0 },
          { label: '2-4hr', value: speedHours >= 2 && speedHours < 4 ? 100 : 0 },
          { label: '4-8hr', value: speedHours >= 4 && speedHours < 8 ? 100 : 0 },
          { label: '8-24hr', value: speedHours >= 8 && speedHours < 24 ? 100 : 0 },
          { label: '> 24hr', value: speedHours >= 24 ? 100 : 0 }
        ];
        
        const chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: speedData.map(d => d.label),
            datasets: [{
              data: speedData.map(d => d.value),
              backgroundColor: speedData.map(d => 
                d.value > 0 ? (speedHours < 4 ? '#10b981' : speedHours < 8 ? '#f59e0b' : '#ef4444') : '#374151'
              ),
              borderRadius: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { title: { display: true, text: 'Response Time' } },
              y: { 
                title: { display: true, text: 'Performance' }, 
                beginAtZero: true,
                max: 100
              }
            }
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
      <div className="h-full bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0c1425] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  return (
    <div className="h-full bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0c1425] text-white font-inter">
      <div className="flex h-full">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800/80 backdrop-blur-lg rounded-lg border border-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col gap-6 border-r border-white/10 bg-slate-900/50 backdrop-blur-lg p-6`}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg grid place-content-center">
              <Waveform className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pink's Pulse</span>
          </div>

          <button className="flex items-center justify-between gap-3 text-sm font-medium bg-pink-600/20 hover:bg-pink-600/30 transition p-3 rounded-lg">
            <span className="flex items-center gap-3">
              <Plus className="h-4 w-4" />
              New Quote
            </span>
            <kbd className="text-xs text-white/60 hidden sm:block">⌘N</kbd>
          </button>

          <nav className="flex flex-col gap-1 text-sm">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Music className="h-4 w-4" />
              Quotes
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Radio className="h-4 w-4" />
              <span className="flex-1">Live Tracking</span>
              <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md">LIVE</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <FileAudio className="h-4 w-4" />
              Jobs
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Users className="h-4 w-4" />
              Clients
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <SlidersHorizontal className="h-4 w-4" />
              Settings
            </a>
          </nav>

          <div className="mt-auto bg-gradient-to-br from-pink-600/20 to-purple-600/20 p-4 rounded-xl">
            <p className="text-sm leading-snug">Get insights on your <span className="font-semibold text-pink-400">2026 projections</span> and recurring revenue!</p>
            <div className="flex items-center justify-between mt-4 text-sm">
              <button className="hover:underline text-white/70">View Details</button>
              <button className="bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-md font-medium">Explore</button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4 px-4 lg:px-6 py-4 border-b border-white/10 bg-slate-900/30 backdrop-blur-lg">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-8"></div>
              <div>
                <h1 className="text-base lg:text-lg font-medium">Sales Analytics</h1>
                <p className="text-xs lg:text-sm text-white/60">{kpis.avgQPD30Day} quotes/day avg • Pink's Lawn Care</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative hidden sm:block">
                <Bell className="h-5 w-5" />
                {data.kpis.convertedToday > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-500"></span>
                )}
              </button>
              <HelpCircle className="h-5 w-5 hidden sm:block" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-sm font-semibold">
                P
              </div>
            </div>
          </header>

          {/* Debug Info */}
          {data?.kpis?._debug && (
            <div className="bg-blue-600/20 backdrop-blur-sm px-4 py-2 text-xs text-blue-300 overflow-auto max-h-32">
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

          {/* Main Content */}
          <section className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Quotes Today</p>
                    <p className="text-2xl font-semibold">{kpis.quotesSentToday}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <Music className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Converted Today</p>
                    <p className="text-2xl font-semibold">{kpis.convertedToday}</p>
                  </div>
                  <div className="h-10 w-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Week CVR</p>
                    <p className="text-2xl font-semibold">{kpis.cvrThisWeek}</p>
                  </div>
                  <div className="h-10 w-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Revenue Today</p>
                    <p className="text-2xl font-semibold">{kpis.convertedAmountToday}</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Revenue Trends */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">Revenue Trends</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +12.5%
                    </span>
                    <select className="text-xs bg-slate-800/50 border border-white/10 rounded px-2 py-1">
                      <option>This Month</option>
                      <option>Last Month</option>
                    </select>
                  </div>
                </div>
                <div className="h-48">
                  <canvas ref={revenueChartRef}></canvas>
                </div>
              </div>

              {/* Quote Status Distribution */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h2 className="font-medium mb-4">Quote Status</h2>
                <div className="h-48">
                  <canvas ref={conversionChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Weekly Conversions & KPIs table */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Weekly Conversions Chart */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h2 className="font-medium mb-4">Weekly Conversions</h2>
                <div className="h-48">
                  <canvas ref={weeklyChartRef}></canvas>
                </div>
              </div>

              {/* KPIs table */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-white/60 border-b border-white/10">
                      <tr>
                        <th className="py-4 px-3 lg:px-5">Metric</th>
                        <th className="py-4 px-3 lg:px-5">Current</th>
                        <th className="py-4 px-3 lg:px-5 hidden sm:table-cell">Target</th>
                        <th className="py-4 px-3 lg:px-5 hidden md:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <span className="truncate">Speed to Lead</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5">{kpis.speedToLead30Day}</td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">< 2 hrs</td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Needs Work
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <span className="truncate">30-Day CVR</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5">{kpis.cvr30Day}</td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">25%</td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            On Track
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <span className="truncate">Avg Quotes/Day</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5">{kpis.avgQPD30Day}</td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">15</td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Good
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <span className="truncate">2026 Recurring Rev</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5">{kpis.recurringRevenue2026}</td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">$1M</td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Projected
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Speed to Lead Analysis */}
            <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium">Speed to Lead Analysis</h2>
                <button className="text-xs text-white/60 hover:text-white transition">View Details</button>
              </div>
              <div className="h-64">
                <canvas ref={speedChartRef}></canvas>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;