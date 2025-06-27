import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useKPIData } from '../../hooks/useKPIData';

const ModernDashboard: React.FC = () => {
  const { data, loading } = useKPIData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return <div className="p-8 text-center">No data available</div>;
  }

  const { kpis } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Sales Dashboard
            </h1>
            <span className="text-sm text-gray-500">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Revenue Today"
            value={kpis.convertedAmountToday}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Quotes Sent Today"
            value={kpis.quotesSentToday}
            icon={<Target className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Converted Today"
            value={kpis.convertedToday}
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Weekly CVR"
            value={kpis.cvrThisWeek}
            icon={<Activity className="h-6 w-6" />}
            color="orange"
            trend={12}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Weekly Performance
            </h2>
            <WeeklyChart data={kpis.weeklyHistorical} />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              30-Day Metrics
            </h2>
            <div className="space-y-4">
              <StatRow label="Speed to Lead" value={kpis.speedToLead30Day} />
              <StatRow label="Conversion Rate" value={kpis.cvr30Day} />
              <StatRow label="Avg Quotes/Day" value={kpis.avgQPD30Day} />
              <StatRow label="Next Month OTB" value={kpis.nextMonthOTB} highlight />
            </div>
          </div>
        </div>

        {/* Revenue Projections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Projections
            </h2>
            <ProjectionsList data={kpis.monthlyProjections} />
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              On The Books
            </h2>
            <OTBList data={kpis.otbByMonth} />
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  2026 Recurring Revenue
                </span>
                <span className="text-2xl font-bold text-green-600">
                  {kpis.recurringRevenue2026}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Sub-components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
  trend?: number;
}> = ({ title, value, icon, color, trend }) => {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-transparent hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ 
  label, 
  value, 
  highlight 
}) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">{label}</span>
    <span className={`font-semibold ${highlight ? 'text-lg text-green-600' : 'text-gray-900'}`}>
      {value}
    </span>
  </div>
);

const WeeklyChart: React.FC<{ data: any[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.sent));
  
  return (
    <div className="space-y-3">
      {data.map((week, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{week.weekEnding}</span>
            <span>{week.sent} sent / {week.converted} converted</span>
          </div>
          <div className="relative">
            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(week.sent / maxValue) * 100}%` }}
              />
              <div 
                className="absolute top-0 h-full bg-green-500 rounded-full"
                style={{ width: `${(week.converted / maxValue) * 100}%` }}
              />
            </div>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
              {week.cvr}% CVR
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectionsList: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="space-y-3">
    {data.map((item, index) => (
      <div key={index} className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{item.month}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">
            ${(item.projected / 1000).toFixed(0)}k
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            item.confidence === 'high' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {item.confidence}
          </span>
        </div>
      </div>
    ))}
  </div>
);

const OTBList: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="space-y-3">
    {data.slice(0, 3).map((item, index) => (
      <div key={index} className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{item.month}</span>
        <span className="font-semibold text-gray-900">
          ${(item.amount / 1000).toFixed(1)}k
        </span>
      </div>
    ))}
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-8">
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded w-1/3 mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default ModernDashboard;