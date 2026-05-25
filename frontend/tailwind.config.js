/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          250: '#d8dee7',
        },
        teal: {
          750: '#0f6b5f',
          850: '#0b4b43',
        },
        gold: {
          50: '#fff8e6',
          100: '#ffedb3',
          400: '#d99a1e',
          500: '#b7791f',
          700: '#7a4d0b',
        },
        loss: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        accent: {
          50: '#effaf7',
          100: '#d9f1ec',
          400: '#2aa894',
          500: '#168778',
          600: '#0f6b5f',
          700: '#0d5448',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.06), 0 12px 28px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
