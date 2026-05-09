/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{ts,tsx,html}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom slate-based dark theme
        surface: {
          DEFAULT: '#0f172a',  // bg
          2: '#111827',        // bg-2
          panel: '#1e293b',    // panels
          panel2: '#233048',   // elevated panels
        },
        accent: {
          DEFAULT: '#38bdf8',
          2: '#22d3ee',
          amber: '#fbbf24',
          green: '#34d399',
          red: '#f87171',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};
