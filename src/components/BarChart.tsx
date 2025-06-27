import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface BarChartProps {
  labels: string[];
  quotesSent: number[];
  quotesConverted: number[];
}

export const BarChart: React.FC<BarChartProps> = ({ labels, quotesSent, quotesConverted }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgb(209, 213, 219)',
          font: { 
            size: 12,
            family: "'Inter', sans-serif"
          },
          boxWidth: 12,
          boxHeight: 12,
          padding: 16,
          usePointStyle: true,
          pointStyle: 'rectRounded'
        }
      },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: 'end' as const,
        offset: 8,
        color: 'rgb(229, 231, 235)',
        font: {
          size: 12,
          weight: 'bold' as const
        },
        formatter: (value: number) => value.toString()
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
          borderDash: [5, 5]
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
          font: { 
            size: 11,
            family: "'Inter', sans-serif"
          },
          padding: 8
        }
      },
      x: {
        grid: { 
          display: false,
          drawBorder: false
        },
        ticks: {
          color: 'rgb(209, 213, 219)',
          font: { 
            size: 11,
            family: "'Inter', sans-serif"
          },
          padding: 8
        }
      }
    }
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Quotes Sent',
        data: quotesSent,
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 0,
        borderRadius: 6,
        barThickness: 20,
        hoverBackgroundColor: 'rgba(147, 51, 234, 1)'
      },
      {
        label: 'Quotes Converted',
        data: quotesConverted,
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        borderColor: 'rgb(236, 72, 153)',
        borderWidth: 0,
        borderRadius: 6,
        barThickness: 20,
        hoverBackgroundColor: 'rgba(236, 72, 153, 1)'
      }
    ]
  };

  return <Bar options={options} data={data} />;
};