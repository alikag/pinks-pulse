// Mobile optimization utilities

export const isMobile = () => window.innerWidth < 640
export const isTablet = () => window.innerWidth >= 640 && window.innerWidth < 1024
export const isDesktop = () => window.innerWidth >= 1024

// Chart.js mobile configurations
export const getMobileChartOptions = (baseOptions: any) => {
  const width = window.innerWidth
  
  if (width < 640) {
    // Mobile optimizations
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          display: true,
          position: 'top',
          labels: {
            boxWidth: 8,
            padding: 5,
            font: {
              size: 9
            }
          }
        }
      },
      scales: baseOptions.scales ? Object.entries(baseOptions.scales).reduce((acc, [key, scale]: [string, any]) => {
        acc[key] = {
          ...scale,
          ticks: {
            ...scale.ticks,
            maxTicksLimit: 4,
            font: {
              size: 8
            },
            // Use compact formatting for mobile
            callback: scale.ticks?.callback || ((value: any) => {
              if (typeof value === 'number') {
                if (key === 'y' && value >= 1000) {
                  return `$${(value / 1000).toFixed(0)}k`
                }
                return value.toString()
              }
              return value
            })
          },
          title: {
            ...scale.title,
            display: false // Hide axis titles on mobile
          }
        }
        return acc
      }, {} as any) : baseOptions.scales
    }
  }
  
  if (width < 1024) {
    // Tablet optimizations
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          labels: {
            boxWidth: 10,
            padding: 8,
            font: {
              size: 10
            }
          }
        }
      },
      scales: baseOptions.scales ? Object.entries(baseOptions.scales).reduce((acc, [key, scale]: [string, any]) => {
        acc[key] = {
          ...scale,
          ticks: {
            ...scale.ticks,
            maxTicksLimit: 5,
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
      }, {} as any) : baseOptions.scales
    }
  }
  
  // Desktop - return as is
  return baseOptions
}

// Sales Team Performance mobile header fix
export const getSalesTeamHeaderClass = () => {
  return "bg-gray-900/50 backdrop-blur-lg border-b border-white/10 px-4 md:px-6 py-4 flex-shrink-0"
}

// Add padding for mobile to account for hamburger menu
export const getMobilePadding = () => {
  if (isMobile()) {
    return { paddingLeft: '60px' }
  }
  return {}
}