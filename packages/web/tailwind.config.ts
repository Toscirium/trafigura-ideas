import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          page: '#0d0d0d',
          card: '#1a1a19',
        },
        ink: {
          primary: '#ffffff',
          secondary: '#c3c2b7',
          muted: '#898781',
        },
        line: {
          hairline: '#2c2c2a',
          baseline: '#383835',
        },
        status: {
          gain: '#0ca30c',
          loss: '#d03b3b',
        },
        desk: {
          crude: '#3987e5',
          'fuel-oil': '#d95926',
          metals: '#199e70',
          lng: '#c98500',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
