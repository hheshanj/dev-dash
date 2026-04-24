/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#f8fafc',
        card:    '#ffffff',
        border:  'rgba(148, 163, 184, 0.3)',
        accent:  '#2563eb',
        'accent-hover': '#1d4ed8',
        'accent-glow': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
