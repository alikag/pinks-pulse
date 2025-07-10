import { useState, useEffect } from 'react';
import { BigQueryService } from '../services/bigquery';
import type { DashboardData, TimePeriod } from '../types/dashboard';
import { useDashboardDataMock } from './useDashboardDataMock';

// Temporary flag to use mock data when API fails
const USE_MOCK_ON_ERROR = true;

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const mockData = useDashboardDataMock();

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
      console.error('Error in useDashboardData:', err);
      
      if (USE_MOCK_ON_ERROR && mockData.data) {
        console.warn('[Dashboard] Using mock data due to API error');
        setData(mockData.data);
        setError(null);
      } else {
        setError('Failed to fetch dashboard data');
      }
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