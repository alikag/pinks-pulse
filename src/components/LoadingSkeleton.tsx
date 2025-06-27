import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08081a] text-white">
      <div className="relative w-[390px] max-w-full h-[844px] bg-gradient-to-b from-[#181830] to-[#0a0a17] shadow-xl rounded-[40px] overflow-hidden border-4 border-[#171731] flex flex-col mx-auto">
        <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 z-10 flex items-center justify-center" style={{ height: '44px' }}>
          <div className="w-24 h-4 bg-black/80 rounded-b-3xl mt-2"></div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center p-2 text-xs mt-2">
            <div className="h-3 w-12 bg-gray-700/50 rounded animate-pulse"></div>
            <div className="flex space-x-2">
              <div className="h-3 w-3 bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-3 w-3 bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-3 w-3 bg-gray-700/50 rounded animate-pulse"></div>
            </div>
          </div>
          <header className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="h-8 w-32 bg-gray-700/50 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-700/50 rounded-full animate-pulse"></div>
            </div>
          </header>
          <div className="px-6 mb-4">
            <div className="h-10 bg-[#1e1e3a] rounded-xl animate-pulse"></div>
          </div>
          <main className="px-6 pb-20 flex-1 overflow-y-auto hide-scrollbar">
            {/* Chart Card Skeleton */}
            <div className="bg-[#1e1e3a] rounded-2xl p-5 shadow-lg mb-6 animate-pulse">
              <div className="flex justify-between items-center mb-5">
                <div className="h-5 w-32 bg-gray-700/50 rounded"></div>
                <div className="h-4 w-20 bg-purple-400/20 rounded"></div>
              </div>
              <div className="h-[180px] bg-gray-700/20 rounded mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#151530] rounded-xl p-3">
                  <div className="h-3 w-20 bg-gray-700/50 rounded mb-2"></div>
                  <div className="h-6 w-16 bg-gray-700/50 rounded mb-1"></div>
                  <div className="h-3 w-12 bg-green-400/20 rounded"></div>
                </div>
                <div className="bg-[#151530] rounded-xl p-3">
                  <div className="h-3 w-24 bg-gray-700/50 rounded mb-2"></div>
                  <div className="h-6 w-20 bg-gray-700/50 rounded mb-1"></div>
                  <div className="h-3 w-12 bg-green-400/20 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* Pie Chart Skeleton */}
            <div className="bg-[#1e1e3a] rounded-2xl p-5 shadow-lg mb-6 animate-pulse">
              <div className="flex justify-between items-center mb-5">
                <div className="h-5 w-40 bg-gray-700/50 rounded"></div>
                <div className="h-4 w-16 bg-purple-400/20 rounded"></div>
              </div>
              <div className="flex mb-5">
                <div className="w-24 h-24 bg-gray-700/20 rounded-full mr-5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-4/5 bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-2/3 bg-gray-700/50 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* List Skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1e1e3a] rounded-2xl p-4 shadow-lg animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 mr-3"></div>
                      <div>
                        <div className="h-4 w-24 bg-gray-700/50 rounded mb-1"></div>
                        <div className="h-3 w-20 bg-gray-700/50 rounded"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-5 w-16 bg-gray-700/50 rounded mb-1"></div>
                      <div className="h-3 w-12 bg-gray-700/50 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};