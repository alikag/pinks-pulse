import React from 'react'
import { motion } from 'framer-motion'

interface CircularProgressProps {
  value: number
  target: number
  size?: number
  strokeWidth?: number
  label?: string
  format?: 'percentage' | 'currency' | 'number'
  glowColor?: string
  className?: string
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  target,
  size = 120,
  strokeWidth = 8,
  label,
  format = 'percentage',
  glowColor = 'rgba(14, 165, 233, 0.6)',
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / target, 1)
  const offset = circumference - progress * circumference

  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${(progress * 100).toFixed(0)}%`
      case 'currency':
        return `$${(value / 1000).toFixed(0)}k`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getStatusColor = () => {
    if (progress >= 0.9) return '#10b981' // green
    if (progress >= 0.7) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-50"
        style={{ 
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          transform: 'scale(1.2)'
        }}
      />
      
      {/* SVG Circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStatusColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${getStatusColor()})`
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{formatValue()}</span>
        {label && <span className="text-xs text-gray-400 mt-1">{label}</span>}
      </div>
    </div>
  )
}

export default CircularProgress