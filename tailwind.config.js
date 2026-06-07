/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#141413',
        surface: '#1d1b18',
        surfaceHighlight: '#252320',
        primary: '#cc785c',
        primaryDim: '#c6613f',
        accent: '#d97757',
        textMain: '#faf9f5',
        textMuted: '#b0aea5',
        textDim: '#87867f',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(204, 120, 92, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(204, 120, 92, 0.5), 0 0 40px rgba(204, 120, 92, 0.15)' },
        },
      },
    },
  },
  plugins: [],
}
