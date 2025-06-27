import { useState, useEffect } from 'react';
import { BigQueryService } from '../services/bigquery';
import type { DashboardData, TimePeriod } from '../types/dashboard';

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dashboardData = await BigQueryService.fetchDashboardData();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    selectedPeriod,
    setSelectedPeriod
  };
};