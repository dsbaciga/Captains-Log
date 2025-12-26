/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Crimson Pro', 'serif'],
        'body': ['Manrope', 'sans-serif'],
      },
      colors: {
        // Primary - Deep Ocean
        primary: {
          50: '#f0f4f8',
          100: '#d9e6f2',
          200: '#b3cde5',
          300: '#8db4d8',
          400: '#679bcb',
          500: '#2b5a7f',
          600: '#1e4158',
          700: '#163347',
          800: '#0f2535',
          900: '#081623',
        },
        // Accent - Light Blue
        accent: {
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Cool Neutrals
        cream: '#f8fafc',
        parchment: '#f1f5f9',
        'warm-gray': '#e2e8f0',
        charcoal: '#1e293b',
        slate: '#64748b',
        // Dark Mode
        navy: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        sky: '#7dd3fc',
      },
    },
  },
  plugins: [],
}
