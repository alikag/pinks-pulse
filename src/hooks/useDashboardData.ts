import { useState, useEffect } from 'react';
import { BigQueryService } from '../services/bigquery';
import type { DashboardData, TimePeriod } from '../types/dashboard';

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching dashboard data...');
      const dashboardData = await BigQueryService.fetchDashboardData();
      console.log('Dashboard data received:', dashboardData);
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error in useDashboardData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = () => {
    console.log('Refetching dashboard data...');
    fetchData();
  };

  return {
    data,
    loading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    refetch
  };
};