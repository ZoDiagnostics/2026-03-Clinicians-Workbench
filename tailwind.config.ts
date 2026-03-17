import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Tailwind CSS configuration for ZoCW (Zo Clinicians Workbench).
 *
 * Features:
 * - Extended ZoCW brand palette (Teal, Navy, Gold)
 * - 9-state procedure status badge colors
 * - Inter font family
 * - Responsive design tokens
 */
const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /**
       * ZoCW Brand Colors
       */
      colors: {
        // Primary brand colors
        primary: {
          50: '#f0f9f8',
          100: '#d9f1f0',
          200: '#b4e3e1',
          300: '#7ecfca',
          400: '#4eb8b2',
          500: '#0D7377', // Primary teal
          600: '#0a5a5f',
          700: '#084a52',
          800: '#073a46',
          900: '#05293d',
          950: '#031a26',
        },
        secondary: {
          50: '#f3f6fb',
          100: '#e8eef7',
          200: '#d5dff1',
          300: '#b5c5e8',
          400: '#8fa3db',
          500: '#0B1E3C', // Navy
          600: '#081629',
          700: '#060d1a',
          800: '#050a14',
          900: '#03060e',
          950: '#010203',
        },
        accent: {
          50: '#fef9f3',
          100: '#fdf2e7',
          200: '#fae4cf',
          300: '#f7cfb0',
          400: '#f2b88f',
          500: '#B8832A', // Gold
          600: '#9a6d21',
          700: '#7c5717',
          800: '#654312',
          900: '#522c0a',
          950: '#351907',
        },

        /**
         * Procedure Status Badge Colors (9-state lifecycle)
         */
        'status-pending': '#9CA3AF',        // gray-400
        'status-received': '#06B6D4',       // cyan-500
        'status-ready': '#F59E0B',          // amber-500
        'status-draft': '#8B5CF6',          // violet-500
        'status-appended': '#EC4899',       // pink-500
        'status-completed': '#10B981',      // emerald-500
        'status-appended-completed': '#6366F1', // indigo-500
        'status-closed': '#6B7280',         // gray-500
        'status-void': '#EF4444',           // red-500
      },

      /**
       * Font Family Configuration
       */
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },

      /**
       * Extended Typography
       */
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },

      /**
       * Spacing Scale
       */
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },

      /**
       * Box Shadows for elevation
       */
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },

      /**
       * Border Radius
       */
      borderRadius: {
        'xs': '0.25rem',
        'sm': '0.375rem',
        'base': '0.5rem',
        'md': '0.625rem',
        'lg': '0.75rem',
        'xl': '1rem',
      },

      /**
       * Animations for UI feedback
       */
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      /**
       * Z-index scale
       */
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'auto': 'auto',
      },
    },
  },

  /**
   * Plugin Configuration
   */
  plugins: [],

  /**
   * Safelist for dynamic classes (used when not statically analyzable)
   */
  safelist: [
    {
      pattern: /^(bg|text|border|ring)-(status-\w+)$/,
      variants: ['hover', 'focus', 'active'],
    },
  ],
};

export default config;
