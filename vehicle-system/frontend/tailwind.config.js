/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Enforcement/compliance palette: deep highway-night navy, signal amber
        // for attention states, lane-marking white, and a muted slate for text.
        navy: {
          950: '#0B1220',
          900: '#101A2E',
          800: '#16223B',
          700: '#1E2E4D',
        },
        amber: {
          500: '#F2A93B',
          600: '#DB8E1F',
        },
        signal: {
          green: '#3FA66A',
          red: '#D8534F',
        },
        paper: '#F6F4EE',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        plate: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
