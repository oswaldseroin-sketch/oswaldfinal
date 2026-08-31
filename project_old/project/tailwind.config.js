/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0e12',
        surface: '#15171d',
        card: '#1a1d24',
        input: '#101218',
        neon: '#00e5ff',
        'neon-dim': '#00b8d4',
        accent: '#ff2bd6',
        success: '#22ff88',
        warning: '#ffb020',
        error: '#ff3b5c',
        'error-dim': '#7a1a28',
        ink: '#f2f4f8',
        'ink-muted': '#8b92a3',
        'ink-faint': '#5a6172',
        line: '#262a35',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
