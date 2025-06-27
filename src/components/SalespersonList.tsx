import React from 'react';
import type { SalespersonData } from '../types/dashboard';

interface SalespersonListProps {
  salespersons: SalespersonData[];
}

const getIconColorClass = (color: string): string => {
  if (color.includes('147, 51, 234')) return 'purple';
  if (color.includes('236, 72, 153')) return 'pink';
  if (color.includes('59, 130, 246')) return 'blue';
  if (color.includes('16, 185, 129')) return 'green';
  return 'gray';
};

export const SalespersonList: React.FC<SalespersonListProps> = ({ salespersons }) => {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Top Performers</h3>
        <p className="text-sm text-gray-400">Individual salesperson metrics</p>
      </div>
      <div>
        {salespersons.map((person, index) => {
          const colorClass = getIconColorClass(person.color);
          return (
            <div 
              key={person.name}
              className={`bg-[#1e1e3a] rounded-2xl p-5 shadow-lg border border-[#2a2a4a] ${index < salespersons.length - 1 ? 'mb-4' : ''}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full bg-${colorClass}-500/20 flex items-center justify-center mr-3`}>
                    <i className={`fas fa-user text-${colorClass}-400`}></i>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{person.name}</p>
                    <p className="text-sm text-gray-300">{person.quotesSent} quotes | ${person.valueConverted.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{person.conversionRate}%</p>
                  <p className="text-sm text-gray-300">conversion</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};