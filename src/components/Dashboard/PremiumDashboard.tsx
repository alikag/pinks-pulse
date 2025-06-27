import React from 'react';
import { useKPIData } from '../../hooks/useKPIData';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3
} from 'lucide-react';

const PremiumDashboard: React.FC = () => {
  const { data, loading } = useKPIData();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">No data available</div>;
  }

  const { kpis } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pink's Performance</h1>
              <p className="text-gray-400 text-sm mt-1">Real-time business metrics</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Last updated</p>
              <p className="text-sm font-medium">{new Date(data.lastUpdated).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Today's Performance */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Today's Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Revenue Today"
              value={kpis.convertedAmountToday}
              icon={<DollarSign className="w-5 h-5" />}
              trend={15}
              color="green"
            />
            <MetricCard
              title="Quotes Sent"
              value={kpis.quotesSentToday}
              icon={<Target className="w-5 h-5" />}
              color="blue"
            />
            <MetricCard
              title="Conversions"
              value={kpis.convertedToday}
              icon={<TrendingUp className="w-5 h-5" />}
              trend={8}
              color="purple"
            />
          </div>
        </div>

        {/* Weekly Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Weekly Performance</h3>
                <span className="text-2xl font-bold text-green-400">{kpis.cvrThisWeek} CVR</span>
              </div>
              <WeeklyChart data={kpis.weeklyHistorical} />
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
            <div className="space-y-4">
              <MetricRow
                label="Speed to Lead"
                value={kpis.speedToLead30Day}
                icon={<Clock className="w-4 h-4" />}
              />
              <MetricRow
                label="30-Day CVR"
                value={kpis.cvr30Day}
                icon={<BarChart3 className="w-4 h-4" />}
              />
              <MetricRow
                label="Avg Quotes/Day"
                value={kpis.avgQPD30Day}
                icon={<Calendar className="w-4 h-4" />}
              />
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Next Month OTB</span>
                  <span className="text-xl font-bold text-green-400">{kpis.nextMonthOTB}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Projections</h3>
            <ProjectionList data={kpis.monthlyProjections} />
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                <span className="text-gray-300">Weekly Revenue</span>
                <span className="text-xl font-bold">{kpis.convertedAmountThisWeek}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <span className="text-green-300">2026 Recurring</span>
                <span className="text-xl font-bold text-green-400">{kpis.recurringRevenue2026}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color: 'green' | 'blue' | 'purple';
}> = ({ title, value, icon, trend, color }) => {
  const colors = {
    green: 'from-green-900/20 to-green-800/20 border-green-800 text-green-400',
    blue: 'from-blue-900/20 to-blue-800/20 border-blue-800 text-blue-400',
    purple: 'from-purple-900/20 to-purple-800/20 border-purple-800 text-purple-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 bg-gray-800 rounded-lg">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

const MetricRow: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-gray-400">
      {icon}
      <span>{label}</span>
    </div>
    <span className="font-semibold">{value}</span>
  </div>
);

const WeeklyChart: React.FC<{ data: any[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.sent));
  
  return (
    <div className="space-y-3">
      {data.map((week, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">{week.weekEnding}</span>
            <span className="text-gray-300">{week.cvr}% CVR</span>
          </div>
          <div className="relative h-10 bg-gray-800 rounded-lg overflow-hidden">
            <div 
              className="absolute top-0 h-full bg-blue-600 opacity-50"
              style={{ width: `${(week.sent / maxValue) * 100}%` }}
            />
            <div 
              className="absolute top-0 h-full bg-green-500"
              style={{ width: `${(week.converted / maxValue) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm">
              <span className="text-white font-medium">{week.sent} → {week.converted}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectionList: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="space-y-3">
    {data.slice(0, 4).map((item, index) => (
      <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
        <span className="text-gray-300">{item.month}</span>
        <div className="flex items-center gap-3">
          <span className="font-semibold">${(item.projected / 1000).toFixed(0)}k</span>
          <span className={`text-xs px-2 py-1 rounded ${
            item.confidence === 'high' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
          }`}>
            {item.confidence}
          </span>
        </div>
      </div>
    ))}
  </div>
);

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  </div>
);

export default PremiumDashboard;