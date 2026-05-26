/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        tempest: '#0B1E2D',
        abyss: '#143447',
        storm: '#1E7C86',
        dragonfire: '#43C7C7',
        fog: '#B5C0C9',
        silver: '#D8E0E5',
        ember: '#B88A3B',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 32px rgba(67, 199, 199, 0.25)',
        rune: 'inset 0 0 0 1px rgba(67, 199, 199, 0.18)',
      },
      backgroundImage: {
        'storm-veil':
          'radial-gradient(ellipse at 20% 0%, rgba(67,199,199,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(30,124,134,0.25) 0%, transparent 60%), linear-gradient(180deg, #0B1E2D 0%, #08161f 100%)',
        'scale-grid':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><path d='M0 20 Q10 0 20 20 T40 20' fill='none' stroke='%231E7C86' stroke-opacity='0.12' stroke-width='1'/></svg>\")",
      },
      keyframes: {
        drift: {
          '0%': { transform: 'translate3d(-2%, 0, 0)' },
          '100%': { transform: 'translate3d(2%, 0, 0)' },
        },
        flicker: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 18px rgba(67,199,199,0.25)' },
          '50%': { boxShadow: '0 0 36px rgba(67,199,199,0.55)' },
        },
      },
      animation: {
        drift: 'drift 28s ease-in-out infinite alternate',
        flicker: 'flicker 4s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        pulseGlow: 'pulseGlow 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
