// Mobile chart optimizations for DashboardV2
import type { ChartOptions } from 'chart.js'

// const isMobile = () => window.innerWidth < 640
// const isTablet = () => window.innerWidth >= 640 && window.innerWidth < 1024

// Format compact currency for mobile
export const formatMobileCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toFixed(0)}`
}

// Optimize chart options for mobile
export const optimizeChartForMobile = (options: ChartOptions): ChartOptions => {
  const width = window.innerWidth
  
  // Mobile settings
  if (width < 640) {
    return {
      ...options,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins?.legend,
          display: true,
          position: 'top' as const,
          labels: {
            boxWidth: 8,
            padding: 5,
            font: {
              size: 9
            }
          }
        },
        tooltip: {
          ...options.plugins?.tooltip,
          bodyFont: {
            size: 10
          },
          titleFont: {
            size: 11
          }
        }
      },
      scales: options.scales ? Object.entries(options.scales).reduce((acc, [key, scale]: [string, any]) => {
        const isYAxis = key.startsWith('y')
        const hasMoneyCallback = scale.ticks?.callback?.toString().includes('$')
        
        acc[key] = {
          ...scale,
          ticks: {
            ...scale.ticks,
            maxTicksLimit: isYAxis ? 4 : 6,
            font: {
              size: 8
            },
            padding: 2,
            // Use compact formatting for Y axes on mobile
            callback: (value: any, index: number, values: any[]) => {
              if (isYAxis && typeof value === 'number') {
                // For currency axes
                if (hasMoneyCallback) {
                  return formatMobileCurrency(value)
                }
                // For percentage axes
                if (scale.ticks?.callback?.toString().includes('%')) {
                  return `${value}%`
                }
                // For regular number axes
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`
                }
                return value.toString()
              }
              // For X axis - abbreviate day names
              if (key === 'x' && scale.ticks?.callback) {
                return scale.ticks.callback.call({ getLabelForValue: (i: number) => {
                  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  return labels[i] || ''
                }}, value, index, values)
              }
              return scale.ticks?.callback ? scale.ticks.callback(value, index, values) : value
            }
          },
          title: {
            ...scale.title,
            display: false // Hide axis titles on mobile
          },
          grid: {
            ...scale.grid,
            drawBorder: false,
            lineWidth: 0.5
          }
        }
        return acc
      }, {} as any) : options.scales
    }
  }
  
  // Tablet settings
  if (width < 1024) {
    return {
      ...options,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins?.legend,
          labels: {
            boxWidth: 10,
            padding: 8,
            font: {
              size: 10
            }
          }
        }
      },
      scales: options.scales ? Object.entries(options.scales).reduce((acc, [key, scale]: [string, any]) => {
        acc[key] = {
          ...scale,
          ticks: {
            ...scale.ticks,
            maxTicksLimit: key.startsWith('y') ? 5 : 7,
            font: {
              size: 9
            }
          },
          title: {
            ...scale.title,
            font: {
              size: 10
            }
          }
        }
        return acc
      }, {} as any) : options.scales
    }
  }
  
  // Desktop - return original
  return options
}