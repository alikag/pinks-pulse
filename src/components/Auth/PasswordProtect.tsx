import React, { useState, useEffect } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import RainbowLoadingWave from '../RainbowLoadingWave';

interface PasswordProtectProps {
  children: React.ReactNode;
}

const PasswordProtect: React.FC<PasswordProtectProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const authToken = localStorage.getItem('dashboard_auth');
    if (authToken === 'authenticated_2025') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a slight delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Password check - you can change this password
    const correctPassword = import.meta.env.VITE_DASHBOARD_PASSWORD || 'pinks2025';
    
    if (password === correctPassword) {
      localStorage.setItem('dashboard_auth', 'authenticated_2025');
      setError('');
      setShowLoadingAnimation(true);
      
      // Show loading animation for 2 seconds before revealing dashboard
      setTimeout(() => {
        setIsAuthenticated(true);
        setShowLoadingAnimation(false);
      }, 2000);
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  if (showLoadingAnimation) {
    return <RainbowLoadingWave />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            {/* Logo area with gradient */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-lg opacity-50"></div>
              <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg ring-4 ring-white/20">
                <img 
                  src="/logo.png" 
                  alt="Pink's Window Services" 
                  className="w-full h-full object-cover"
                />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Pink's Pulse
            </h1>
            <p className="text-gray-400 text-center">
              Hudson Valley KPI Dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-400 animate-shake">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Access Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              Protected by enterprise-grade security
            </p>
            <p className="text-xs text-gray-600 text-center mt-2">
              Contact your administrator for access
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            © 2025 Pink's Window Services • Hudson Valley
          </p>
        </div>
      </div>

    </div>
  );
};

export default PasswordProtect;