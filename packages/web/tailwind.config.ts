import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          page: '#0a0b0d',
          card: '#15171a',
          raised: '#1c1f23',
        },
        ink: {
          primary: '#f5f6f4',
          secondary: '#c3c2b7',
          muted: '#8a8d92',
        },
        line: {
          hairline: '#24272b',
          baseline: '#33373c',
        },
        status: {
          gain: '#1fae5c',
          loss: '#e0473f',
        },
        desk: {
          crude: '#3987e5',
          'fuel-oil': '#d97a3a',
          metals: '#22b087',
          lng: '#d1a13a',
        },
        brand: {
          subtle: '#122236',
          muted: '#2a5a9c',
          DEFAULT: '#3987e5',
          strong: '#6ba8f5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 24px -18px rgba(0,0,0,0.7)',
        raised: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 16px 40px -20px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(61,139,240,0.4), 0 0 24px -4px rgba(61,139,240,0.35)',
      },
      backgroundImage: {
        meridian: 'radial-gradient(circle at 15% 20%, rgba(61,139,240,0.16), transparent 45%), radial-gradient(circle at 85% 0%, rgba(34,176,135,0.10), transparent 40%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
