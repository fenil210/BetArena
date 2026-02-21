/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary dark palette
        dark: {
          50: '#f0f2f5',
          100: '#e1e5eb',
          200: '#c3cad6',
          300: '#8a95a8',
          400: '#5a6578',
          500: '#3d4659',
          600: '#2a3142',
          700: '#1e2433',
          800: '#151a27',
          900: '#0f172a',
          950: '#080c16',
        },
        // Accent green (wins, active states)
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Loss red
        loss: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Betting gold (for special markets, featured)
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
