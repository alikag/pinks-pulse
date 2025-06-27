import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { SalespersonData } from '../types/dashboard';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SalespersonChartProps {
  salespersons: SalespersonData[];
}

export const SalespersonChart: React.FC<SalespersonChartProps> = ({ salespersons }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false }
    }
  };

  const data = {
    labels: salespersons.map(sp => sp.name),
    datasets: [{
      data: salespersons.map(sp => sp.valueConverted),
      backgroundColor: salespersons.map(sp => sp.color),
      borderWidth: 0,
      borderRadius: 4
    }]
  };

  const totalValue = salespersons.reduce((sum, sp) => sum + sp.valueConverted, 0);

  return (
    <div className="relative w-24 h-24">
      <Doughnut options={options} data={data} />
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-xs text-white/70">Total</span>
        <span className="font-bold text-white">${totalValue.toLocaleString()}</span>
      </div>
    </div>
  );
};