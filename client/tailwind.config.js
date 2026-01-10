/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        void: '#050508',
        deep: '#0a0a0f',
        surface: '#12121a',
        elevated: '#1a1a24',
        
        // Accents
        cyan: {
          DEFAULT: '#00d4ff',
          dim: 'rgba(0, 212, 255, 0.15)',
          glow: 'rgba(0, 212, 255, 0.4)',
        },
        amber: {
          DEFAULT: '#ffb800',
          dim: 'rgba(255, 184, 0, 0.15)',
        },
        coral: {
          DEFAULT: '#ff6b6b',
          dim: 'rgba(255, 107, 107, 0.15)',
        },
        violet: {
          DEFAULT: '#a855f7',
          dim: 'rgba(168, 85, 247, 0.15)',
        },
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.06)',
        default: 'rgba(255, 255, 255, 0.1)',
        bright: 'rgba(255, 255, 255, 0.15)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
