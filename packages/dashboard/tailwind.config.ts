import type { Config } from 'tailwindcss';

/**
 * Crown Jewel design tokens — the only place colour literals live.
 * Everything else references these or the CSS variables in globals.css.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        void: '#05070C',
        obsidian: '#0A0F18',
        'obsidian-raised': '#111926',
        hairline: 'rgba(255,255,255,0.07)',
        emerald: {
          DEFAULT: '#19D68F',
          deep: '#0B7A55',
          teal: '#14B8A6',
        },
        champagne: {
          DEFAULT: '#E9C985',
          amber: '#F59E0B',
        },
        mist: {
          DEFAULT: '#E8EDF5',
          dim: '#93A0B5',
          faint: '#6F7B93',
        },
        danger: '#FF5C7A',
        warning: '#FFB84D',
        info: '#5CC8FF',
        discord: '#5865F2',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'display-1': ['clamp(2.75rem, 6.2vw, 5rem)', { lineHeight: '0.98', letterSpacing: '-0.035em' }],
        'display-2': ['clamp(2.15rem, 4.4vw, 3.5rem)', { lineHeight: '1.03', letterSpacing: '-0.03em' }],
        'display-3': ['clamp(1.7rem, 3vw, 2.4rem)', { lineHeight: '1.1', letterSpacing: '-0.024em' }],
        'title-1': ['clamp(1.3rem, 2vw, 1.65rem)', { lineHeight: '1.22', letterSpacing: '-0.018em' }],
        'title-2': ['1.15rem', { lineHeight: '1.32', letterSpacing: '-0.012em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1.1', letterSpacing: '0.14em' }],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '14px',
        lg: '22px',
        xl: '32px',
        '2xl': '40px',
      },
      spacing: {
        section: 'clamp(4.5rem, 9vw, 8.5rem)',
        gutter: 'clamp(1rem, 4vw, 2.5rem)',
      },
      maxWidth: {
        shell: '1240px',
        prose: '68ch',
      },
      boxShadow: {
        'glow-xs': '0 0 12px rgba(25,214,143,0.14)',
        'glow-sm': '0 0 18px rgba(25,214,143,0.20)',
        glow: '0 0 40px rgba(25,214,143,0.28)',
        'glow-lg': '0 0 80px rgba(25,214,143,0.32)',
        'glow-champagne': '0 0 40px rgba(233,201,133,0.22)',
        lift: '0 12px 32px rgba(0,0,0,0.45)',
        'lift-lg': '0 24px 64px rgba(0,0,0,0.55)',
        'inner-top': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'gradient-emerald': 'linear-gradient(135deg, #19D68F 0%, #14B8A6 100%)',
        'gradient-champagne': 'linear-gradient(135deg, #E9C985 0%, #F59E0B 100%)',
        'gradient-radial-emerald':
          'radial-gradient(120% 120% at 30% 0%, rgba(25,214,143,0.22), transparent 62%)',
      },
      transitionTimingFunction: {
        crown: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        250: '250ms',
        400: '400ms',
        600: '600ms',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-dot': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
        'eq-bar': { '0%,100%': { transform: 'scaleY(0.3)' }, '50%': { transform: 'scaleY(1)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        aurora: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(4%,-6%) scale(1.08)' },
          '66%': { transform: 'translate(-4%,4%) scale(0.96)' },
        },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'border-beam': {
          '0%': { offsetDistance: '0%' },
          '100%': { offsetDistance: '100%' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.28s cubic-bezier(0.22,1,0.36,1)',
        'accordion-up': 'accordion-up 0.24s cubic-bezier(0.22,1,0.36,1)',
        'fade-in-up': 'fade-in-up 0.35s cubic-bezier(0.22,1,0.36,1)',
        'fade-in': 'fade-in 0.3s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.22,1,0.36,1)',
        shimmer: 'shimmer 2.4s linear infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'eq-bar': 'eq-bar 1s ease-in-out infinite',
        marquee: 'marquee 36s linear infinite',
        aurora: 'aurora 18s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        'border-beam': 'border-beam 4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
