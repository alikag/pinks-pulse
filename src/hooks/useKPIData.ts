import { useState, useEffect } from 'react';
import axios from 'axios';
import type { KPIData } from '../types/kpi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useKPIData = () => {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/dashboard-data`);
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError('Failed to load dashboard data');
      console.log('Using mock data due to API connection error');
      
      // Fallback to mock data for development
      setData({
        kpis: {
          quotesSentToday: 12,
          convertedToday: 3,
          convertedAmountToday: '$4,500',
          convertedThisWeek: 15,
          cvrThisWeek: '25.0%',
          convertedAmountThisWeek: '$22,500',
          speedToLead30Day: '2.5 hrs',
          cvr30Day: '28.5%',
          avgQPD30Day: '8.5',
          recurringRevenue2026: '$125,000',
          nextMonthOTB: '$18,500',
          weeklyHistorical: [
            { weekEnding: '6/23/2025', sent: 45, converted: 12, cvr: '26.7' },
            { weekEnding: '6/16/2025', sent: 52, converted: 15, cvr: '28.8' },
            { weekEnding: '6/9/2025', sent: 38, converted: 9, cvr: '23.7' },
          ],
          otbByMonth: [
            { month: 'Jul 2025', amount: 22500 },
            { month: 'Aug 2025', amount: 25000 },
            { month: 'Sep 2025', amount: 28000 },
          ],
          otbByWeek: [
            { weekStart: '6/30/2025', amount: 5500 },
            { weekStart: '7/7/2025', amount: 6200 },
            { weekStart: '7/14/2025', amount: 5800 },
          ],
          monthlyProjections: [
            { month: 'Jul 2025', projected: 30000, confidence: 'high' },
            { month: 'Aug 2025', projected: 35000, confidence: 'medium' },
            { month: 'Sep 2025', projected: 40000, confidence: 'medium' },
          ],
        },
        lastUpdated: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
};