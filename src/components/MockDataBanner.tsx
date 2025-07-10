import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface MockDataBannerProps {
  onDismiss?: () => void
}

export const MockDataBanner: React.FC<MockDataBannerProps> = ({ onDismiss }) => {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 m-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-yellow-500 mb-1">
          Using Sample Data
        </h3>
        <p className="text-xs text-gray-300">
          The dashboard is currently showing sample data because the BigQuery connection is unavailable. 
          Check the{' '}
          <a 
            href="/test-env.html" 
            target="_blank"
            className="text-yellow-400 hover:text-yellow-300 underline"
          >
            environment test page
          </a>
          {' '}to diagnose the issue.
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}