/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        background: {
          primary: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6'
        },
        foreground: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF'
        },
        accent: {
          pink: '#EC4899',      // Use sparingly
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6'
        },
        border: '#E5E7EB',
        
        // Dark mode colors
        dark: {
          background: {
            primary: '#0F172A',
            secondary: '#1E293B',
            tertiary: '#334155'
          },
          foreground: {
            primary: '#F9FAFB',
            secondary: '#E5E7EB',
            muted: '#9CA3AF'
          },
          accent: {
            pink: '#F472B6',
            success: '#34D399',
            warning: '#FBBF24',
            danger: '#F87171',
            info: '#60A5FA'
          },
          border: '#334155'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}