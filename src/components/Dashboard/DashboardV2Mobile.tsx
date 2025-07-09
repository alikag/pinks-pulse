// Mobile-specific chart configurations for DashboardV2
import { ChartConfiguration } from 'chart.js'

// Mobile-optimized chart options
export const getMobileChartConfig = (): {
  fontSize: { title: number; label: number; tick: number; legend: number }
  padding: { x: number; y: number; legend: number }
  ticks: { maxTicksLimit: number }
  showAxisTitles: boolean
} => {
  const width = window.innerWidth
  
  if (width < 640) {
    // Phone
    return {
      fontSize: { title: 10, label: 9, tick: 8, legend: 9 },
      padding: { x: 3, y: 3, legend: 5 },
      ticks: { maxTicksLimit: 4 },
      showAxisTitles: false
    }
  } else if (width < 1024) {
    // Tablet
    return {
      fontSize: { title: 11, label: 10, tick: 9, legend: 10 },
      padding: { x: 8, y: 8, legend: 8 },
      ticks: { maxTicksLimit: 5 },
      showAxisTitles: true
    }
  }
  
  // Desktop
  return {
    fontSize: { title: 12, label: 11, tick: 10, legend: 11 },
    padding: { x: 10, y: 10, legend: 10 },
    ticks: { maxTicksLimit: 6 },
    showAxisTitles: true
  }
}

// Compact number formatting for mobile
export const formatCompactValue = (value: number, isCurrency: boolean = false): string => {
  const absValue = Math.abs(value)
  
  if (absValue >= 1000000) {
    return `${isCurrency ? '$' : ''}${(value / 1000000).toFixed(1)}M`
  }
  if (absValue >= 1000) {
    return `${isCurrency ? '$' : ''}${(value / 1000).toFixed(0)}k`
  }
  
  return isCurrency ? `$${value.toFixed(0)}` : value.toString()
}

// Update chart options for mobile responsiveness
export const applyMobileChartOptions = (baseOptions: any): any => {
  const config = getMobileChartConfig()
  const isMobile = window.innerWidth < 640
  
  return {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: {
        ...baseOptions.plugins?.legend,
        labels: {
          ...baseOptions.plugins?.legend?.labels,
          boxWidth: config.fontSize.legend,
          padding: config.padding.legend,
          font: {
            size: config.fontSize.legend
          }
        }
      }
    },
    scales: baseOptions.scales ? Object.entries(baseOptions.scales).reduce((acc, [key, scale]: [string, any]) => {
      const isYAxis = key.startsWith('y')
      const isCurrencyAxis = scale.ticks?.callback?.toString().includes('$')
      
      acc[key] = {
        ...scale,
        ticks: {
          ...scale.ticks,
          maxTicksLimit: config.ticks.maxTicksLimit,
          font: {
            size: config.fontSize.tick
          },
          // Apply compact formatting on mobile
          callback: isMobile && isYAxis ? (value: any) => {
            return formatCompactValue(Number(value), isCurrencyAxis)
          } : scale.ticks?.callback
        },
        title: {
          ...scale.title,
          display: config.showAxisTitles,
          font: {
            size: config.fontSize.title
          }
        }
      }
      return acc
    }, {} as any) : baseOptions.scales
  }
}