import React from 'react';
import { useKPIData } from '../../hooks/useKPIData';

const CleanDashboard: React.FC = () => {
  const { data, loading } = useKPIData();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100">
        <h1 className="text-xl font-medium text-gray-900">Dashboard</h1>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Primary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <Stat label="Revenue Today" value={kpis.convertedAmountToday} />
          <Stat label="Quotes Sent" value={kpis.quotesSentToday} />
          <Stat label="Conversions" value={kpis.convertedToday} />
          <Stat label="CVR" value={kpis.cvrThisWeek} highlight />
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <Section title="Weekly Performance">
              <div className="space-y-4">
                {kpis.weeklyHistorical?.map((week, i) => (
                  <WeekRow key={i} week={week} />
                ))}
              </div>
            </Section>

            <Section title="30-Day Metrics">
              <div className="space-y-3">
                <Metric label="Speed to Lead" value={kpis.speedToLead30Day} />
                <Metric label="Conversion Rate" value={kpis.cvr30Day} />
                <Metric label="Avg Quotes/Day" value={kpis.avgQPD30Day} />
              </div>
            </Section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <Section title="Revenue">
              <div className="space-y-3">
                <Metric label="This Week" value={kpis.convertedAmountThisWeek} large />
                <Metric label="Next Month OTB" value={kpis.nextMonthOTB} />
                <Metric label="2026 Recurring" value={kpis.recurringRevenue2026} />
              </div>
            </Section>

            <Section title="Projections">
              <div className="space-y-3">
                {kpis.monthlyProjections?.slice(0, 3).map((proj, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{proj.month}</span>
                    <span className="text-sm font-medium">${(proj.projected / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <div className="text-sm text-gray-500 mb-1">{label}</div>
    <div className={`text-2xl font-medium ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
      {value}
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h2 className="text-sm font-medium text-gray-900 mb-4">{title}</h2>
    {children}
  </div>
);

const Metric: React.FC<{ label: string; value: string | number; large?: boolean }> = ({ label, value, large }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50">
    <span className="text-sm text-gray-600">{label}</span>
    <span className={`${large ? 'text-lg font-medium' : 'text-sm'} text-gray-900`}>{value}</span>
  </div>
);

const WeekRow: React.FC<{ week: any }> = ({ week }) => {
  const conversionRate = week.sent > 0 ? ((week.converted / week.sent) * 100) : 0;
  
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600">{week.weekEnding}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{week.sent} sent</span>
        <span className="text-sm text-gray-900 font-medium">{week.converted} converted</span>
        <span className="text-sm text-blue-600">{conversionRate.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default CleanDashboard;