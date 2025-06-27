import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import type { MonthlyProjection } from '../../types/kpi';
import { formatCompactNumber } from '../../utils/formatters';

interface MonthlyProjectionsChartProps {
  data: MonthlyProjection[];
}

const MonthlyProjectionsChart: React.FC<MonthlyProjectionsChartProps> = ({ data }) => {
  return (
    <div className="bg-background-primary dark:bg-dark-background-secondary rounded-xl border border-border dark:border-dark-border p-4 md:p-6">
      <h3 className="text-lg font-semibold text-foreground-primary dark:text-dark-foreground-primary mb-6">
        Revenue Projections (Jul-Dec 2025)
      </h3>
      
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#E5E7EB"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCompactNumber(value)}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#E5E7EB', strokeDasharray: '3 3' }}
            />
            
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#EC4899"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              strokeWidth={2}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Confidence Legend */}
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-success" />
          <span className="text-xs text-foreground-secondary">High Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-warning" />
          <span className="text-xs text-foreground-secondary">Medium Confidence</span>
        </div>
      </div>
    </div>
  );
};

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-background-primary dark:bg-dark-background-primary border border-border dark:border-dark-border rounded-lg shadow-lg p-3">
      <p className="text-xs font-medium text-foreground-secondary mb-2">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground-primary">
        ${payload[0].value.toLocaleString()}
      </p>
      <div className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded ${
        data.confidence === 'high' ? 'bg-green-100 text-green-800' :
        data.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        <span>{data.confidence} confidence</span>
      </div>
    </div>
  );
};

export default MonthlyProjectionsChart;