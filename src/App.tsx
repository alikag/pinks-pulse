import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardV2 from './components/Dashboard/DashboardV2'
import SalesTeamPerformance from './components/SalesTeamPerformance/SalesTeamPerformance'
import OperationalKPIs from './components/OperationalKPIs/OperationalKPIs'
import PasswordProtect from './components/Auth/PasswordProtect'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PasswordProtect>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<DashboardV2 />} />
                <Route path="sales-team" element={<SalesTeamPerformance />} />
                <Route path="operational-kpis" element={<OperationalKPIs />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PasswordProtect>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App