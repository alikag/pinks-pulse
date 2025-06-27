import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ModernDashboard from './components/Dashboard/ModernDashboard'
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
          <ModernDashboard />
        </PasswordProtect>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App