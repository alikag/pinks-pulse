import React, { useEffect, useRef, useState } from 'react'
import { Menu, Bell, HelpCircle, Music, HardDrive, Activity, DollarSign, TrendingUp, Circle, MoreHorizontal, Plus, LayoutDashboard, Radio, FileAudio, Users, SlidersHorizontal, AudioWaveform } from 'lucide-react'
import Chart from 'chart.js/auto'
import { useDashboardData } from '../../hooks/useDashboardData'

const SoundForgeDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { data, loading, error, selectedPeriod } = useDashboardData()
  
  // Chart refs
  const revenueChartRef = useRef<HTMLCanvasElement>(null)
  const genreChartRef = useRef<HTMLCanvasElement>(null)
  const usageChartRef = useRef<HTMLCanvasElement>(null)
  const spectrumChartRef = useRef<HTMLCanvasElement>(null)
  
  // Chart instances
  const revenueChartInstance = useRef<Chart | null>(null)
  const genreChartInstance = useRef<Chart | null>(null)
  const usageChartInstance = useRef<Chart | null>(null)
  const spectrumChartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    // Setup charts
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)'
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'

    // Destroy existing charts
    if (revenueChartInstance.current) revenueChartInstance.current.destroy()
    if (genreChartInstance.current) genreChartInstance.current.destroy()
    if (usageChartInstance.current) usageChartInstance.current.destroy()
    if (spectrumChartInstance.current) spectrumChartInstance.current.destroy()

    // Revenue Chart
    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext('2d')
      if (ctx) {
        revenueChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
              label: 'Revenue',
              data: [8500, 9200, 11800, 10400, 12600, 13900, 15200, 14100, 16800, 18200, 17500, 19800],
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
              data: [10000, 10500, 11000, 11500, 12000, 12500, 13000, 13500, 14000, 14500, 15000, 15500],
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
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                  callback: function(value) {
                    return '$' + (Number(value) / 1000) + 'k'
                  }
                }
              },
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              }
            }
          }
        })
      }
    }

    // Genre Distribution
    if (genreChartRef.current) {
      const ctx = genreChartRef.current.getContext('2d')
      if (ctx) {
        genreChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Hip-Hop', 'Electronic', 'Pop', 'Jazz', 'Rock'],
            datasets: [{
              data: [30, 25, 20, 15, 10],
              backgroundColor: ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'],
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
        })
      }
    }

    // Studio Usage Chart
    if (usageChartRef.current) {
      const ctx = usageChartRef.current.getContext('2d')
      if (ctx) {
        usageChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              data: [8, 12, 6, 15, 10, 14, 9],
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { 
                beginAtZero: true, 
                ticks: { stepSize: 5 },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              },
              x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              }
            }
          }
        })
      }
    }

    // Frequency Spectrum
    if (spectrumChartRef.current) {
      const ctx = spectrumChartRef.current.getContext('2d')
      if (ctx) {
        const frequencies = Array.from({length: 11}, () => Math.random() * 100)
        
        spectrumChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['20', '40', '80', '160', '320', '640', '1.2k', '2.5k', '5k', '10k', '20k'],
            datasets: [{
              data: frequencies,
              backgroundColor: frequencies.map(val => 
                val > 70 ? '#ef4444' : val > 40 ? '#f59e0b' : '#10b981'
              ),
              borderRadius: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { 
                title: { display: true, text: 'Frequency (Hz)' },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              },
              y: { 
                title: { display: true, text: 'Amplitude (dB)' }, 
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
              }
            }
          }
        })
      }
    }

    // Cleanup
    return () => {
      revenueChartInstance.current?.destroy()
      genreChartInstance.current?.destroy()
      usageChartInstance.current?.destroy()
      spectrumChartInstance.current?.destroy()
    }
  }, [data, loading])

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0c1425]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-400 mb-4">Error loading dashboard</p>
            <p className="text-white/60">Using mock data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0c1425] text-white font-inter">
      <div className="flex h-full">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800/80 backdrop-blur-lg rounded-lg border border-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col gap-6 border-r border-white/10 bg-slate-900/50 backdrop-blur-lg p-6`}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg grid place-content-center">
              <AudioWaveform className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">SoundForge</span>
          </div>

          <button className="flex items-center justify-between gap-3 text-sm font-medium bg-blue-600/20 hover:bg-blue-600/30 transition p-3 rounded-lg">
            <span className="flex items-center gap-3">
              <Plus className="h-4 w-4" />
              New Track
            </span>
            <kbd className="text-xs text-white/60 hidden sm:block">⌘N</kbd>
          </button>

          <nav className="flex flex-col gap-1 text-sm">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <LayoutDashboard className="h-4 w-4" />
              Studio
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Music className="h-4 w-4" />
              Beats
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <Radio className="h-4 w-4" />
              <span className="flex-1">Streaming</span>
              <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md">LIVE</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <FileAudio className="h-4 w-4" />
              Samples
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10">
              <Users className="h-4 w-4" />
              Artists
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
              <SlidersHorizontal className="h-4 w-4" />
              Mixer Settings
            </a>
          </nav>

          <div className="mt-auto bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-4 rounded-xl">
            <p className="text-sm leading-snug">Upgrade to Studio PRO for up to <span className="font-semibold text-cyan-400">100GB</span> storage and unlimited tracks!</p>
            <div className="flex items-center justify-between mt-4 text-sm">
              <button className="hover:underline text-white/70">Maybe Later</button>
              <button className="bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-md font-medium">Go Premium</button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
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
                <h1 className="text-base lg:text-lg font-medium">Studio Analytics</h1>
                <p className="text-xs lg:text-sm text-white/60">12 active collaborators • Studio Elite</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative hidden sm:block">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-500"></span>
              </button>
              <HelpCircle className="h-5 w-5 hidden sm:block" />
              <div className="h-8 w-8 rounded-full bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80')"}}></div>
            </div>
          </header>

          {/* Main Content */}
          <section className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Total Tracks</p>
                    <p className="text-2xl font-semibold">247</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <Music className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Storage Used</p>
                    <p className="text-2xl font-semibold">84GB</p>
                  </div>
                  <div className="h-10 w-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Active Sessions</p>
                    <p className="text-2xl font-semibold">12</p>
                  </div>
                  <div className="h-10 w-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60">Revenue</p>
                    <p className="text-2xl font-semibold">$12.4K</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Monthly Revenue Trends */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-medium">Monthly Revenue Trends</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +12.5%
                    </span>
                    <select className="text-xs bg-slate-800/50 border border-white/10 rounded px-2 py-1">
                      <option>2024</option>
                      <option>2023</option>
                    </select>
                  </div>
                </div>
                <div className="h-48">
                  <canvas ref={revenueChartRef}></canvas>
                </div>
              </div>

              {/* Genre Distribution */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h2 className="font-medium mb-4">Genre Distribution</h2>
                <div className="h-48">
                  <canvas ref={genreChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Studio Usage & Artists table */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Studio Usage Chart */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                <h2 className="font-medium mb-4">Studio Usage (7 days)</h2>
                <div className="h-48">
                  <canvas ref={usageChartRef}></canvas>
                </div>
              </div>

              {/* Artists table */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-white/60 border-b border-white/10">
                      <tr>
                        <th className="py-4 px-3 lg:px-5">Artist</th>
                        <th className="py-4 px-3 lg:px-5 hidden sm:table-cell">Genre</th>
                        <th className="py-4 px-3 lg:px-5 hidden md:table-cell">Status</th>
                        <th className="py-4 px-3 lg:px-5 hidden lg:table-cell">Location</th>
                        <th className="py-4 px-3 lg:px-5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <img src="https://randomuser.me/api/portraits/women/32.jpg" className="h-6 w-6 rounded-full" alt="" />
                          <span className="truncate">Maya Chen</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">Electronic</td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Online
                          </span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden lg:table-cell">Tokyo</td>
                        <td className="py-3 px-3 lg:px-5 text-right"><MoreHorizontal className="h-4 w-4" /></td>
                      </tr>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <img src="https://randomuser.me/api/portraits/men/85.jpg" className="h-6 w-6 rounded-full" alt="" />
                          <span className="truncate">Marcus Rivera</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">Hip-Hop <span className="text-cyan-400">★</span></td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Recording
                          </span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden lg:table-cell">LA</td>
                        <td className="py-3 px-3 lg:px-5 text-right"><MoreHorizontal className="h-4 w-4" /></td>
                      </tr>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <img src="https://randomuser.me/api/portraits/women/29.jpg" className="h-6 w-6 rounded-full" alt="" />
                          <span className="truncate">Zara Kim</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">Pop</td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Online
                          </span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden lg:table-cell">Seoul</td>
                        <td className="py-3 px-3 lg:px-5 text-right"><MoreHorizontal className="h-4 w-4" /></td>
                      </tr>
                      <tr className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 lg:px-5 flex items-center gap-2">
                          <img src="https://randomuser.me/api/portraits/women/91.jpg" className="h-6 w-6 rounded-full" alt="" />
                          <span className="truncate">Luna Dubois</span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden sm:table-cell">Jazz <span className="text-cyan-400">★</span></td>
                        <td className="py-3 px-3 lg:px-5 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded-full">
                            <Circle className="h-2 w-2 fill-current" />
                            Away
                          </span>
                        </td>
                        <td className="py-3 px-3 lg:px-5 hidden lg:table-cell">Paris</td>
                        <td className="py-3 px-3 lg:px-5 text-right"><MoreHorizontal className="h-4 w-4" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Frequency Spectrum */}
            <div className="bg-slate-900/40 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium">Frequency Spectrum Analysis</h2>
                <button className="text-xs text-white/60 hover:text-white transition">View Details</button>
              </div>
              <div className="h-64">
                <canvas ref={spectrumChartRef}></canvas>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default SoundForgeDashboard