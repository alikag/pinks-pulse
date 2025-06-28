import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PremiumMobileDashboard from './components/Dashboard/PremiumMobileDashboard'
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
        <PasswordProtect>
          <PremiumMobileDashboard />
        </PasswordProtect>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App