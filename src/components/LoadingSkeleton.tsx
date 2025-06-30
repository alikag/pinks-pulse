import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08081a] text-white">
      <div className="text-center">
        <div className="relative inline-flex mb-8">
          {/* Pink glow behind letters */}
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <span
              className="text-6xl font-extrabold select-none"
              style={{
                color: 'transparent',
                textShadow: '0 0 32px #ec4899, 0 0 64px #ec4899, 0 0 128px #ec4899',
                WebkitTextStroke: '2px #ec4899',
                filter: 'blur(2px)',
                opacity: 0.7,
              }}
            >
              PINKS
            </span>
          </div>
          <div className="relative z-10">
            <span className="text-6xl font-extrabold animate-pulse tracking-widest" style={{ color: '#fff' }}>
              PINKS
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Loading Dashboard</h2>
        <p className="text-gray-400">Connecting to data source...</p>
      </div>
    </div>
  );
};