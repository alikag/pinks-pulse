import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { DiagnosticRunner, DiagnosticResult } from '../utils/diagnostics'

export const DiagnosticPanel: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  
  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const diagnosticResults = await DiagnosticRunner.runAllTests()
      setResults(diagnosticResults)
    } catch (error) {
      console.error('Diagnostic error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    runDiagnostics()
  }, [])
  
  const getIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
    }
  }
  
  const failedTests = results.filter(r => r.status === 'fail')
  const hasFailures = failedTests.length > 0
  
  return (
    <div className="bg-gray-900/50 backdrop-blur-lg border border-white/10 rounded-xl p-6 m-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <h2 className="text-xl font-semibold">System Diagnostics</h2>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Run Tests'}
        </button>
      </div>
      
      {hasFailures && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <h3 className="text-red-400 font-semibold mb-2">Critical Issues Found</h3>
          <p className="text-sm text-gray-300">
            The dashboard cannot load data due to {failedTests.length} critical issue{failedTests.length > 1 ? 's' : ''}.
            Review the failed tests below for specific solutions.
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        {results.map((result) => (
          <div key={result.test} className="border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowDetails(showDetails === result.test ? null : result.test)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getIcon(result.status)}
                <span className="font-medium">{result.test}</span>
              </div>
              <span className={`text-sm ${
                result.status === 'pass' ? 'text-green-400' :
                result.status === 'fail' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {result.message}
              </span>
            </button>
            
            {showDetails === result.test && result.details && (
              <div className="p-4 bg-black/20 border-t border-white/10">
                {result.details.solution && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-1">Solution:</h4>
                    <p className="text-sm text-gray-300">{result.details.solution}</p>
                  </div>
                )}
                
                {result.details.error && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-1">Error Details:</h4>
                    <pre className="text-xs bg-black/40 p-3 rounded overflow-x-auto">
                      {JSON.stringify(result.details.error, null, 2)}
                    </pre>
                  </div>
                )}
                
                {!result.details.solution && !result.details.error && (
                  <pre className="text-xs bg-black/40 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {results.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400">
          <p>No diagnostic results available</p>
        </div>
      )}
    </div>
  )
}