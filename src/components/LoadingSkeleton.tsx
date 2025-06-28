import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08081a] text-white">
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-spin"></div>
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full absolute top-0 left-0 animate-ping"></div>
        </div>
        <h2 className="text-2xl font-bold mt-8 mb-2">Loading Dashboard</h2>
        <p className="text-gray-400">Connecting to data source...</p>
      </div>
    </div>
  );
};