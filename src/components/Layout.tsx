import React, { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { Menu, XCircle, LogOut, BarChart2, Users } from 'lucide-react'
import { haptics } from '../utils/haptics'

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen bg-gray-950 overflow-hidden">
      <div className="flex h-screen">
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
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 h-full transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col border-r border-white/10 bg-gray-900/50 backdrop-blur-lg p-6 flex-shrink-0`}>
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
            <Link 
              to="/" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg relative overflow-hidden group text-gray-300 hover:text-white ${
                isActive('/') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              KPI Dashboard
              <div className="absolute inset-0 bg-gradient-to-r from-[#F9ABAC]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            
            <Link 
              to="/sales-team" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg relative overflow-hidden group text-gray-300 hover:text-white ${
                isActive('/sales-team') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
            >
              <Users className="h-4 w-4" />
              Sales Team Performance
              <div className="absolute inset-0 bg-gradient-to-r from-[#F9ABAC]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
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

        {/* Main content */}
        <main className="flex-1 lg:ml-0 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}