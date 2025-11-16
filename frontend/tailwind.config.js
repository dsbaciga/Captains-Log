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
        // Accent - Weathered Bronze
        accent: {
          300: '#ddb380',
          400: '#c9965f',
          500: '#b67f4a',
          600: '#8f6239',
          700: '#6b4a2b',
        },
        // Warm Neutrals
        cream: '#faf8f5',
        parchment: '#f4f1ec',
        'warm-gray': '#e8dfd4',
        charcoal: '#2d2d2d',
        slate: '#5a5a5a',
        // Dark Mode
        navy: {
          900: '#0f1419',
          800: '#1a2332',
          700: '#243142',
        },
        gold: '#d4a574',
      },
    },
  },
  plugins: [],
}
