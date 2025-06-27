import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatValue } from '../../utils/formatters';

interface KPICardProps {
  label: string;
  value: number | string;
  target?: number | string;
  trend?: {
    value: number;
    label: string;
  };
  format?: 'number' | 'currency' | 'percentage';
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  icon?: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  target,
  trend,
  format = 'number',
  status = 'neutral',
  icon
}) => {
  const formattedValue = formatValue(value, format);
  const formattedTarget = target ? formatValue(target, format) : null;
  const progress = target ? (Number(value) / Number(target)) * 100 : null;
  
  // Determine status color
  const statusColors = {
    success: 'border-accent-success',
    warning: 'border-accent-warning', 
    danger: 'border-accent-danger',
    neutral: 'border-transparent'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative bg-background-primary dark:bg-dark-background-secondary 
        rounded-xl border border-border dark:border-dark-border 
        p-6 shadow-sm hover:shadow-md transition-all duration-200
        ${statusColors[status]} border-t-4
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-background-secondary dark:bg-dark-background-tertiary flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-foreground-secondary dark:text-dark-foreground-secondary uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-foreground-primary dark:text-dark-foreground-primary mt-1">
              {formattedValue}
            </p>
          </div>
        </div>
        
        {/* Target indicator */}
        {target && (
          <div className="text-right">
            <p className="text-xs text-foreground-muted dark:text-dark-foreground-muted">
              Target
            </p>
            <p className="text-sm font-medium text-foreground-secondary dark:text-dark-foreground-secondary">
              {formattedTarget}
            </p>
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      {progress !== null && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-foreground-secondary">Progress</span>
            <span className="text-xs font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-background-tertiary dark:bg-dark-background-tertiary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progress >= 90 ? 'bg-accent-success' :
                progress >= 70 ? 'bg-accent-warning' :
                'bg-accent-danger'
              }`}
            />
          </div>
        </div>
      )}
      
      {/* Trend */}
      {trend && (
        <div className="pt-4 border-t border-border dark:border-dark-border flex items-center justify-between">
          <span className="text-xs text-foreground-secondary">
            {trend.label}
          </span>
          <div className="flex items-center gap-1">
            {trend.value > 0 ? (
              <TrendingUp className="w-3 h-3 text-accent-success" />
            ) : trend.value < 0 ? (
              <TrendingDown className="w-3 h-3 text-accent-danger" />
            ) : (
              <Minus className="w-3 h-3 text-foreground-muted" />
            )}
            <span className={`text-xs font-medium ${
              trend.value > 0 ? 'text-accent-success' :
              trend.value < 0 ? 'text-accent-danger' :
              'text-foreground-muted'
            }`}>
              {Math.abs(trend.value)}%
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default KPICard;