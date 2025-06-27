import React, { useEffect, useState } from 'react';
import { BarChart } from './BarChart';
import { SalespersonChart } from './SalespersonChart';
import { SalespersonList } from './SalespersonList';
import { Navigation } from './Navigation';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useDashboardData } from '../hooks/useDashboardData';
import type { TimePeriod } from '../types/dashboard';

export const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data, loading, error, selectedPeriod, setSelectedPeriod } = useDashboardData();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  const handleDatePicker = () => {
    alert('Open date picker');
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Unable to Load Dashboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Failed to connect to the data source'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-6">
            Please ensure the backend server is running on port 3001 and your BigQuery credentials are configured correctly.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentData = data.timeSeries[selectedPeriod];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08081a] text-white">
      <div className="relative w-[390px] max-w-full h-[844px] bg-gradient-to-b from-[#181830] to-[#0a0a17] shadow-xl rounded-[40px] overflow-hidden border-4 border-[#171731] flex flex-col mx-auto">
        <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 z-10 flex items-center justify-center" style={{ height: '44px' }}>
          <div className="w-24 h-4 bg-black/80 rounded-b-3xl mt-2"></div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center p-2 text-xs mt-2 text-gray-200">
            <span id="clock">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <div className="flex space-x-1 text-gray-200">
              <i className="fas fa-signal"></i>
              <i className="fas fa-wifi"></i>
              <i className="fas fa-battery-three-quarters"></i>
            </div>
          </div>
          <header className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Statistics</h1>
              <button 
                onClick={handleDatePicker}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[#1e1e3a]"
              >
                <i className="fas fa-calendar-alt text-sm"></i>
              </button>
            </div>
          </header>
          <div className="px-6 mb-8">
            <div className="flex bg-[#1e1e3a] rounded-xl p-2 gap-2">
              {(['week', 'month', 'year', 'all'] as TimePeriod[]).map(period => (
                <button
                  key={period}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm min-w-0 transition-all ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-[#2a2a4a]'
                  }`}
                  onClick={() => handlePeriodChange(period)}
                >
                  {period === 'all' ? 'All' : period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <main className="px-6 pb-24 flex-1 overflow-y-auto hide-scrollbar">
            <div className="bg-[#1e1e3a] rounded-2xl p-6 shadow-lg mb-6">
              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">Monthly Overview</h3>
                    <p className="text-sm text-gray-400 mt-2">Quote performance trends • {currentData.period}</p>
                  </div>
                </div>
              </div>
              <div className="h-[200px] relative mb-6">
                <BarChart 
                  labels={currentData.labels} 
                  quotesSent={currentData.quotesSent}
                  quotesConverted={currentData.quotesConverted}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#151530] rounded-xl p-5 border border-[#2a2a4a]">
                  <div className="text-sm font-semibold text-gray-300 mb-3">Income</div>
                  <div className="text-2xl font-bold text-white mb-3">${(currentData.totalConverted * 1500).toLocaleString()}</div>
                  <div className="flex items-center text-green-400 text-sm">
                    <i className="fas fa-arrow-up mr-2"></i>
                    <span className="font-medium">{currentData.conversionChange}</span>
                  </div>
                </div>
                <div className="bg-[#151530] rounded-xl p-5 border border-[#2a2a4a]">
                  <div className="text-sm font-semibold text-gray-300 mb-3">Quotes Sent</div>
                  <div className="text-2xl font-bold text-white mb-3">{currentData.totalSent}</div>
                  <div className="flex items-center text-purple-400 text-sm">
                    <i className="fas fa-arrow-up mr-2"></i>
                    <span className="font-medium">+12.6%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Salesperson Breakdown Section */}
            <div className="bg-[#1e1e3a] rounded-2xl p-6 shadow-lg mb-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white">Salesperson Breakdown</h3>
                <p className="text-sm text-gray-400 mt-2">Revenue distribution by sales rep</p>
              </div>
              <div className="flex items-center justify-center mb-4">
                <SalespersonChart salespersons={data.salespersons} />
              </div>
              <div className="space-y-4">
                {data.salespersons.map(person => (
                  <div key={person.name} className="flex items-center justify-between p-4 bg-[#151530] rounded-xl border border-[#2a2a4a]">
                    <div className="flex items-center flex-1">
                      <div 
                        className="w-4 h-4 rounded-full mr-4 flex-shrink-0" 
                        style={{ backgroundColor: person.color }}
                      ></div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-white truncate">{person.name}</p>
                        <p className="text-sm text-gray-400 mt-1">{person.quotesSent} quotes sent</p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-base font-bold text-white">${person.valueConverted.toLocaleString()}</p>
                      <p className="text-sm text-gray-400 mt-1">{person.conversionRate}% rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <SalespersonList salespersons={data.salespersons} />
          </main>
        </div>
        <Navigation />
      </div>
    </div>
  );
};