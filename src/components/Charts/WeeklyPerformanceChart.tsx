import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { WeeklyHistorical } from '../../types/kpi';

interface WeeklyPerformanceChartProps {
  data: WeeklyHistorical[];
}

const PRIMARY_PINK = '#ec4899'; // Tailwind pink-500
const PRIMARY_PINK_TRANSPARENT = 'rgba(236, 72, 153, 0.5)';

const WeeklyPerformanceChart: React.FC<WeeklyPerformanceChartProps> = ({ data }) => {
  // Helper to determine if this is the current week
  function isCurrentWeek(weekEnding: string) {
    const today = new Date();
    const weekEnd = new Date(weekEnding);
    // If weekEnd is within 7 days of today, treat as current week
    return Math.abs(today.getTime() - weekEnd.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }

  // Transform data for the chart
  const chartData = data.map(week => ({
    week: week.weekEnding.split('/').slice(0, 2).join('/'), // Show MM/DD
    sent: week.sent,
    converted: week.converted,
    cvr: parseFloat(week.cvr),
    isCurrent: isCurrentWeek(week.weekEnding)
  }));

  return (
    <div className="bg-background-primary dark:bg-dark-background-secondary rounded-xl border border-border dark:border-dark-border p-4 md:p-6">
      <h3 className="text-lg font-semibold text-foreground-primary dark:text-dark-foreground-primary mb-6">
        Weekly Performance Trends
      </h3>
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#E5E7EB"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={({ x, y, payload, index }: any) => {
                const isCurrent = chartData[index]?.isCurrent;
                return (
                  <text
                    x={x}
                    y={y + 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isCurrent ? 700 : 400}
                    fill={isCurrent ? PRIMARY_PINK : '#6B7280'}
                  >
                    {payload.value}
                  </text>
                );
              }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'transparent' }}
            />
            <Bar
              dataKey="sent"
              radius={[4, 4, 0, 0]}
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`sent-bar-${index}`} fill={entry.isCurrent ? PRIMARY_PINK_TRANSPARENT : '#3B82F6'} />
              ))}
            </Bar>
            <Bar
              dataKey="converted"
              radius={[4, 4, 0, 0]}
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`converted-bar-${index}`} fill={entry.isCurrent ? PRIMARY_PINK : '#10B981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-info" />
          <span className="text-xs text-foreground-secondary">Quotes Sent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-success" />
          <span className="text-xs text-foreground-secondary">Converted</span>
        </div>
      </div>
    </div>
  );
};

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-background-primary dark:bg-dark-background-primary border border-border dark:border-dark-border rounded-lg shadow-lg p-3">
      <p className="text-xs font-medium text-foreground-secondary mb-2">
        Week of {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-foreground-primary capitalize">
            {entry.name}: {entry.value}
          </span>
        </div>
      ))}
      {payload[0] && payload[1] && (
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xs text-foreground-secondary">
            CVR: {((payload[1].value / payload[0].value) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default WeeklyPerformanceChart;