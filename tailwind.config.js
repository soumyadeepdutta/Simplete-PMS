/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS-variable colors (also forced in src/index.css so dark mode
        // cannot fall back to stale JIT hex / missing utilities).
        page: 'var(--color-page)',
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
        },
        sidebar: 'var(--color-sidebar)',
        rail: 'var(--color-rail)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        ink: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        accent: {
          blue: 'var(--color-accent-blue)',
          'blue-soft': 'var(--color-accent-blue-soft)',
          green: 'var(--color-accent-green)',
          'green-soft': 'var(--color-accent-green-soft)',
          red: 'var(--color-accent-red)',
          'red-soft': 'var(--color-accent-red-soft)',
          orange: 'var(--color-accent-orange)',
          'orange-soft': 'var(--color-accent-orange-soft)',
          purple: 'var(--color-accent-purple)',
          'purple-soft': 'var(--color-accent-purple-soft)',
          yellow: 'var(--color-accent-yellow)',
          'yellow-soft': 'var(--color-accent-yellow-soft)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        elevated: 'var(--shadow-elevated)',
        window: 'var(--shadow-window)',
        drag: '0 20px 30px -5px rgba(0, 0, 0, 0.15)',
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
}
