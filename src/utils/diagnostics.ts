// Diagnostic utilities to identify root causes of failures

export interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export class DiagnosticRunner {
  static async runAllTests(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    
    // Test 1: Environment Variables
    results.push(await this.testEnvironmentVariables())
    
    // Test 2: API Endpoint
    results.push(await this.testAPIEndpoint())
    
    // Test 3: BigQuery Connection
    results.push(await this.testBigQueryConnection())
    
    // Test 4: Network Connectivity
    results.push(await this.testNetworkConnectivity())
    
    return results
  }
  
  static async testEnvironmentVariables(): Promise<DiagnosticResult> {
    try {
      const response = await fetch('/.netlify/functions/dashboard-data-sales/test')
      const data = await response.json()
      
      if (!data.env.hasProjectId) {
        return {
          test: 'Environment Variables',
          status: 'fail',
          message: 'BIGQUERY_PROJECT_ID is not set in Netlify',
          details: {
            solution: 'Add BIGQUERY_PROJECT_ID to Netlify environment variables',
            hasProjectId: false,
            hasCredentials: data.env.hasCredentials || false
          }
        }
      }
      
      return {
        test: 'Environment Variables',
        status: 'pass',
        message: 'Environment variables are properly configured',
        details: data.env
      }
    } catch (error) {
      return {
        test: 'Environment Variables',
        status: 'fail',
        message: 'Cannot reach test endpoint',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }
  
  static async testAPIEndpoint(): Promise<DiagnosticResult> {
    try {
      const response = await fetch('/.netlify/functions/dashboard-data-sales', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 500) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { raw: errorText }
        }
        
        // Analyze the error to determine root cause
        if (errorData.message?.includes('credentials')) {
          return {
            test: 'API Endpoint',
            status: 'fail',
            message: 'Invalid Google Cloud credentials',
            details: {
              solution: 'Check GOOGLE_APPLICATION_CREDENTIALS_JSON format',
              error: errorData
            }
          }
        }
        
        if (errorData.message?.includes('permission')) {
          return {
            test: 'API Endpoint',
            status: 'fail',
            message: 'Service account lacks BigQuery permissions',
            details: {
              solution: 'Grant BigQuery Data Viewer and Job User roles',
              error: errorData
            }
          }
        }
        
        if (errorData.message?.includes('not found') || errorData.message?.includes('Not found')) {
          return {
            test: 'API Endpoint',
            status: 'fail',
            message: 'BigQuery tables/views not found',
            details: {
              solution: 'Verify jobber_data.v_quotes and v_jobs exist in your BigQuery project',
              error: errorData,
              projectId: errorData.message?.match(/Table ([^ ]+) was not found/)?.[1] || 'Check error details'
            }
          }
        }
        
        return {
          test: 'API Endpoint',
          status: 'fail',
          message: 'API returned 500 error',
          details: errorData
        }
      }
      
      if (response.ok) {
        return {
          test: 'API Endpoint',
          status: 'pass',
          message: 'API endpoint is functioning correctly'
        }
      }
      
      return {
        test: 'API Endpoint',
        status: 'fail',
        message: `API returned status ${response.status}`,
        details: { status: response.status }
      }
    } catch (error) {
      return {
        test: 'API Endpoint',
        status: 'fail',
        message: 'Cannot reach API endpoint',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }
  
  static async testBigQueryConnection(): Promise<DiagnosticResult> {
    try {
      const response = await fetch('/.netlify/functions/test-bigquery-connection')
      
      if (!response.ok) {
        const error = await response.text()
        return {
          test: 'BigQuery Connection',
          status: 'fail',
          message: 'BigQuery connection test failed',
          details: { error }
        }
      }
      
      const data = await response.json()
      return {
        test: 'BigQuery Connection',
        status: 'pass',
        message: 'BigQuery connection successful',
        details: data
      }
    } catch (error) {
      return {
        test: 'BigQuery Connection',
        status: 'warning',
        message: 'BigQuery test endpoint not available',
        details: { note: 'This is optional, main API test is more important' }
      }
    }
  }
  
  static async testNetworkConnectivity(): Promise<DiagnosticResult> {
    try {
      // Test if we can reach Google's public API
      const response = await fetch('https://www.googleapis.com/discovery/v1/apis', {
        method: 'HEAD'
      })
      
      if (response.ok) {
        return {
          test: 'Network Connectivity',
          status: 'pass',
          message: 'Can reach Google APIs'
        }
      }
      
      return {
        test: 'Network Connectivity',
        status: 'warning',
        message: 'Possible network restrictions'
      }
    } catch (error) {
      return {
        test: 'Network Connectivity',
        status: 'warning',
        message: 'Cannot test external connectivity',
        details: { note: 'CORS may be blocking this test' }
      }
    }
  }
  
  static generateReport(results: DiagnosticResult[]): string {
    const failed = results.filter(r => r.status === 'fail')
    const warnings = results.filter(r => r.status === 'warning')
    
    let report = '# Diagnostic Report\n\n'
    
    if (failed.length === 0) {
      report += '✅ All critical tests passed!\n\n'
    } else {
      report += `❌ ${failed.length} critical issue(s) found:\n\n`
      
      failed.forEach(result => {
        report += `## ${result.test}: FAILED\n`
        report += `**Issue:** ${result.message}\n`
        if (result.details?.solution) {
          report += `**Solution:** ${result.details.solution}\n`
        }
        if (result.details?.error) {
          report += `**Error Details:**\n\`\`\`\n${JSON.stringify(result.details.error, null, 2)}\n\`\`\`\n`
        }
        report += '\n'
      })
    }
    
    if (warnings.length > 0) {
      report += `\n⚠️ ${warnings.length} warning(s):\n\n`
      warnings.forEach(result => {
        report += `- ${result.test}: ${result.message}\n`
      })
    }
    
    return report
  }
}