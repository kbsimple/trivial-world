import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS configuration for Question Generator Web App
 * Theme colors match mobile app per UI-SPEC
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background colors per UI-SPEC
        background: '#1a1a2e',
        card: '#2a2a4e',
        foreground: '#ffffff',

        // Category colors (matching mobile app)
        blue: '#0066cc',
        pink: '#ff69b4',
        yellow: '#ffd700',
        purple: '#9932cc',
        green: '#228b22',
        orange: '#ff8c00',

        // Confidence score colors per UI-SPEC
        confidence: {
          high: '#22c55e',   // 100% (3/3 passes)
          medium: '#eab308', // 67% (2/3 passes)
          low: '#ef4444',    // 33% or lower (0-1/3 passes)
        },

        // Interactive colors per UI-SPEC
        primary: '#3b82f6',
        secondary: '#6b7280',
        destructive: '#ef4444',
        muted: 'rgba(255,255,255,0.7)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // Spacing scale per UI-SPEC (multiples of 4)
        '4.5': '18px',
      },
    },
  },
  plugins: [],
};

export default config;