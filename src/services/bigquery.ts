import axios from 'axios';
import type { DashboardData, TimePeriod } from '../types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';

export class BigQueryService {
  static async fetchDashboardData(): Promise<DashboardData> {
    try {
      console.log('[BigQueryService] Fetching dashboard data from:', `${API_BASE_URL}/dashboard-data-sales`);
      const response = await axios.get(`${API_BASE_URL}/dashboard-data-sales`);
      
      console.log('[BigQueryService] Response status:', response.status);
      console.log('[BigQueryService] Response data:', response.data);
      console.log('[BigQueryService] Data source:', response.data?.dataSource || 'unknown');
      console.log('[BigQueryService] Response data keys:', Object.keys(response.data || {}));
      console.log('[BigQueryService] Has timeSeries?', !!response.data?.timeSeries);
      console.log('[BigQueryService] Has salespersons?', !!response.data?.salespersons);
      
      if (response.data?.error) {
        console.error('[BigQueryService] Server returned error:', response.data.error);
      }
      
      if (response.data?.dataSource === 'mock') {
        console.warn('[BigQueryService] ⚠️ WARNING: Server is returning mock data!');
        console.warn('[BigQueryService] This means BigQuery connection failed on the server');
        console.warn('[BigQueryService] Check Netlify environment variables and function logs');
      } else if (response.data?.dataSource === 'bigquery') {
        console.log('[BigQueryService] ✅ SUCCESS: Server returned BigQuery data');
        console.log('[BigQueryService] KPI Metrics:', response.data?.kpiMetrics);
      }
      
      // Remove the dataSource and error fields before returning
      const { dataSource, error, ...cleanData } = response.data;
      return cleanData;
    } catch (error) {
      console.error('[BigQueryService] Error fetching dashboard data:', error);
      throw error;
    }
  }

  static async fetchTimeSeriesData(period: TimePeriod) {
    try {
      const response = await axios.get(`${API_BASE_URL}/time-series/${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching time series data:', error);
      return this.getMockData().timeSeries[period];
    }
  }

  static getMockData(): DashboardData {
    return {
      timeSeries: {
        week: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          quotesSent: [3, 5, 2, 4, 6, 1, 2],
          quotesConverted: [1, 2, 1, 2, 3, 0, 1],
          conversionRate: [33, 40, 50, 50, 50, 0, 50],
          totalSent: 23,
          totalConverted: 10,
          avgConversionRate: '43.5%',
          conversionChange: '+5.2%',
          period: 'This Week'
        },
        month: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          quotesSent: [18, 22, 25, 20],
          quotesConverted: [4, 8, 10, 7],
          conversionRate: [22.2, 36.4, 40.0, 35.0],
          totalSent: 85,
          totalConverted: 29,
          avgConversionRate: '34.1%',
          conversionChange: '+8.3%',
          period: 'June 2025'
        },
        year: {
          labels: ['Mar', 'Apr', 'May', 'Jun'],
          quotesSent: [15, 45, 68, 85],
          quotesConverted: [3, 12, 22, 29],
          conversionRate: [20.0, 26.7, 32.4, 34.1],
          totalSent: 213,
          totalConverted: 66,
          avgConversionRate: '31.0%',
          conversionChange: '+14.1%',
          period: '2025'
        },
        all: {
          labels: ['March', 'April', 'May', 'June'],
          quotesSent: [15, 45, 68, 85],
          quotesConverted: [3, 12, 22, 29],
          conversionRate: [20.0, 26.7, 32.4, 34.1],
          totalSent: 213,
          totalConverted: 66,
          avgConversionRate: '31.0%',
          conversionChange: '+14.1%',
          period: 'Since Launch (Mar 2025)'
        }
      },
      salespersons: [
        { 
          name: 'Michael Squires', 
          quotesSent: 12, 
          quotesConverted: 3, 
          conversionRate: 25.0,
          valueSent: 18819.0,
          valueConverted: 7479.0,
          color: 'rgb(147, 51, 234)'
        },
        { 
          name: 'Christian Ruddy', 
          quotesSent: 6, 
          quotesConverted: 1, 
          conversionRate: 16.7,
          valueSent: 8602.2,
          valueConverted: 826.2,
          color: 'rgb(236, 72, 153)'
        }
      ],
      lastUpdated: new Date()
    };
  }
}