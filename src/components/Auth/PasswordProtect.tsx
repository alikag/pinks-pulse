import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface PasswordProtectProps {
  children: React.ReactNode;
}

const PasswordProtect: React.FC<PasswordProtectProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Check if already authenticated
  useEffect(() => {
    const authToken = localStorage.getItem('dashboard_auth');
    if (authToken === 'authenticated_2025') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password check - you can change this password
    const correctPassword = import.meta.env.VITE_DASHBOARD_PASSWORD || 'pinks2025';
    
    if (password === correctPassword) {
      localStorage.setItem('dashboard_auth', 'authenticated_2025');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-dark-background-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-background-primary dark:bg-dark-background-secondary rounded-xl border border-border dark:border-dark-border p-8 shadow-lg">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-background-secondary dark:bg-dark-background-tertiary rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-accent-info" />
            </div>
            <h1 className="text-2xl font-bold text-foreground-primary dark:text-dark-foreground-primary">
              Sales Dashboard
            </h1>
            <p className="text-sm text-foreground-secondary dark:text-dark-foreground-secondary mt-2">
              Enter password to access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-background-secondary dark:bg-dark-background-tertiary border border-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-info text-foreground-primary dark:text-dark-foreground-primary placeholder-foreground-muted"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-accent-danger">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-accent-info hover:bg-accent-info/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Access Dashboard
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-foreground-muted dark:text-dark-foreground-muted">
              Contact your administrator if you need access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordProtect;