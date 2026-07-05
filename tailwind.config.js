/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          card: '#1a1d27',
          hover: '#21263a',
          border: '#2a2f45',
        },
        accent: {
          DEFAULT: '#4f7cff',
          hover: '#3d6ae0',
        },
        positive: '#22c55e',
        negative: '#ef4444',
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
