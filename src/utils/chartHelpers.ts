// Chart configuration helpers for responsive design

export interface ChartResponsiveConfig {
  fontSize: {
    title: number
    label: number
    tick: number
    legend: number
  }
  padding: {
    x: number
    y: number
    legend: number
  }
  ticks: {
    maxTicksLimit: number
    showLabels: boolean
  }
  aspectRatio?: number
  showAxisTitles: boolean
}

export const getResponsiveChartConfig = (): ChartResponsiveConfig => {
  const width = window.innerWidth
  
  // Mobile configuration (< 640px)
  if (width < 640) {
    return {
      fontSize: {
        title: 10,
        label: 9,
        tick: 8,
        legend: 9
      },
      padding: {
        x: 5,
        y: 5,
        legend: 5
      },
      ticks: {
        maxTicksLimit: 4,
        showLabels: true
      },
      showAxisTitles: false // Hide axis titles on mobile to save space
    }
  }
  
  // Tablet configuration (640px - 1024px)
  if (width < 1024) {
    return {
      fontSize: {
        title: 11,
        label: 10,
        tick: 9,
        legend: 10
      },
      padding: {
        x: 8,
        y: 8,
        legend: 8
      },
      ticks: {
        maxTicksLimit: 5,
        showLabels: true
      },
      showAxisTitles: true
    }
  }
  
  // Desktop configuration (>= 1024px)
  return {
    fontSize: {
      title: 12,
      label: 11,
      tick: 10,
      legend: 11
    },
    padding: {
      x: 10,
      y: 10,
      legend: 10
    },
    ticks: {
      maxTicksLimit: 6,
      showLabels: true
    },
    showAxisTitles: true
  }
}

// Format currency values for mobile displays
export const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toFixed(0)}`
}

// Format numbers compactly for mobile
export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`
  }
  return value.toString()
}

// Get chart height based on screen size
export const getChartHeight = (baseHeight: number = 200): string => {
  const width = window.innerWidth
  
  if (width < 640) {
    return `${baseHeight * 0.8}px` // 80% height on mobile
  }
  if (width < 1024) {
    return `${baseHeight * 0.9}px` // 90% height on tablet
  }
  return `${baseHeight}px`
}