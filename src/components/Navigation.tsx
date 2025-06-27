import React from 'react';

export const Navigation: React.FC = () => {
  const handleAddClick = () => {
    alert('Open add transaction modal');
  };

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-[#151530]/90 rounded-t-3xl py-4 px-6 backdrop-blur-sm" style={{ zIndex: 20 }}>
      <div className="flex justify-center items-center">
        <div className="relative">
          <button 
            className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/20 hover:shadow-xl hover:scale-105 transition-all" 
            onClick={handleAddClick}
            aria-label="Add new quote"
          >
            <i className="fas fa-plus text-white text-xl"></i>
          </button>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">Add Quote</span>
        </div>
      </div>
    </nav>
  );
};