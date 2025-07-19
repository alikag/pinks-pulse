import { useState, useEffect } from 'react';
import { BigQueryService } from '../services/bigquery';
import type { DashboardData, TimePeriod } from '../types/dashboard';

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<{ message: string; time: Date } | null>(null);

  const fetchData = async (isInitialLoad = false, retryCount = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    const startTime = Date.now();
    
    try {
      // For refresh, show refreshing state without clearing existing data
      if (!isInitialLoad && data) {
        setIsRefreshing(true);
        // Also set loading to true to show the full loading animation
        setLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      console.log(`Fetching dashboard data... ${retryCount > 0 ? `(retry ${retryCount}/${maxRetries})` : ''}`);
      const dashboardData = await BigQueryService.fetchDashboardData();
      console.log('Dashboard data received:', dashboardData);
      
      // Ensure minimum loading time of 1 second for better UX
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }
      
      setData(dashboardData);
      setError(null);
      setLastError(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch dashboard data';
      console.error('Error in useDashboardData:', err);
      
      // Retry logic for 500/502 errors
      if (retryCount < maxRetries && (err?.status === 500 || err?.status === 502)) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        setTimeout(() => {
          fetchData(isInitialLoad, retryCount + 1);
        }, delay);
        return;
      }
      
      // For refresh failures, keep existing data and show error notification
      if (!isInitialLoad && data) {
        setLastError({
          message: `Refresh failed after ${retryCount} retries. Showing last successful data.`,
          time: new Date()
        });
      } else {
        // For initial load failures, show error state
        setError(errorMessage);
      }
    } finally {
      if (retryCount === 0 || retryCount >= maxRetries) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const refetch = () => {
    console.log('Refetching dashboard data...');
    fetchData(false);
  };

  return {
    data,
    loading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    refetch,
    isRefreshing,
    lastError
  };
};