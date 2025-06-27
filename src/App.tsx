import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProfessionalDashboard from './components/Dashboard/ProfessionalDashboard'
import PasswordProtect from './components/Auth/PasswordProtect'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PasswordProtect>
        <ProfessionalDashboard />
      </PasswordProtect>
    </QueryClientProvider>
  )
}

export default App