/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Theme-aware palette (powered by CSS variables) ── */
        'kiro-bg':      'var(--kbg)',
        'kiro-panel':   'var(--kpanel)',
        'kiro-panel2':  'var(--kpanel2)',
        'kiro-border':  'var(--kborder)',
        'kiro-border2': 'var(--kborder2)',
        'kiro-accent':  'var(--kaccent)',
        'kiro-accent2': 'var(--kaccent2)',
        'kiro-text':    'var(--ktext)',
        'kiro-muted':   'var(--kmuted)',
        'kiro-subtle':  'var(--ksubtle)',
        /* ── Static utility colors ── */
        'kiro-cyan':    '#0284c7',
        'kiro-green':   '#16a34a',
        'kiro-red':     '#dc2626',
        'kiro-yellow':  '#d97706',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'kiro':    '0 4px 16px rgba(0,0,0,0.10)',
        'kiro-sm': '0 1px 4px rgba(0,0,0,0.06)',
        'kiro-lg': '0 8px 32px rgba(0,0,0,0.12)',
        'kiro-card': '0 2px 8px rgba(0,0,0,0.06)',
        'kiro-card-hover': '0 4px 16px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}
