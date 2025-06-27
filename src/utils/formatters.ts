export const formatValue = (value: number | string, format: 'number' | 'currency' | 'percentage'): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num);
      
    case 'percentage':
      return `${Math.round(num)}%`;
      
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(num);
  }
};

export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};