import React from 'react';
import { TrendingUp, DollarSign, Clock, Calendar, Target } from 'lucide-react';
import type { KPIData } from '../types/kpi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface KPIDashboardProps {
  data: KPIData;
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ data }) => {
  const { kpis } = data;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Today's Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Quotes Sent Today"
          value={kpis.quotesSentToday}
          icon={<Target className="h-4 w-4" />}
          color="blue"
        />
        <MetricCard
          title="Converted Today"
          value={kpis.convertedToday}
          icon={<TrendingUp className="h-4 w-4" />}
          color="green"
        />
        <MetricCard
          title="Revenue Today"
          value={kpis.convertedAmountToday}
          icon={<DollarSign className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* Weekly Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Converted This Week"
          value={kpis.convertedThisWeek}
          icon={<Calendar className="h-4 w-4" />}
          color="blue"
        />
        <MetricCard
          title="CVR This Week"
          value={kpis.cvrThisWeek}
          icon={<Target className="h-4 w-4" />}
          color="green"
        />
        <MetricCard
          title="Revenue This Week"
          value={kpis.convertedAmountThisWeek}
          icon={<DollarSign className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* 30-Day Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="30-Day Speed to Lead"
          value={kpis.speedToLead30Day}
          icon={<Clock className="h-4 w-4" />}
          color="orange"
        />
        <MetricCard
          title="30-Day CVR"
          value={kpis.cvr30Day}
          icon={<Target className="h-4 w-4" />}
          color="green"
        />
        <MetricCard
          title="Avg Quotes/Day"
          value={kpis.avgQPD30Day}
          icon={<Calendar className="h-4 w-4" />}
          color="blue"
        />
        <MetricCard
          title="Next Month OTB"
          value={kpis.nextMonthOTB}
          icon={<DollarSign className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* Revenue Projections */}
      <Card>
        <CardHeader>
          <CardTitle>2026 Recurring Revenue Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">
            {kpis.recurringRevenue2026}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Historical Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Conversion History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-2">Week Ending</th>
                  <th className="pb-2 text-right">Sent</th>
                  <th className="pb-2 text-right">Converted</th>
                  <th className="pb-2 text-right">CVR</th>
                </tr>
              </thead>
              <tbody>
                {kpis.weeklyHistorical.map((week, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-2 text-sm">{week.weekEnding}</td>
                    <td className="py-2 text-sm text-right">{week.sent}</td>
                    <td className="py-2 text-sm text-right">{week.converted}</td>
                    <td className="py-2 text-sm text-right font-medium">{week.cvr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* On The Books Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>On The Books by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kpis.otbByMonth.map((month, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{month.month}</span>
                  <span className="font-medium">
                    ${month.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kpis.monthlyProjections.map((proj, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{proj.month}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      ${proj.projected.toLocaleString()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      proj.confidence === 'high' ? 'bg-green-100 text-green-800' :
                      proj.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {proj.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPIDashboard;