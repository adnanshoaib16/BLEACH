/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sumi: {
          DEFAULT: '#050507',
          800: '#0b0d12',
          600: '#141922',
          400: '#232a35',
        },
        bone: '#ffffff',
        blood: '#ff3b1f',
        ember: '#ff6b00',
        reiatsu: '#00e5ff',
        ice: '#e0ffff',
        chrome: {
          hi: '#ffffff',
          mid: '#8f9cab',
          lo: '#1b222b',
        },
      },
      fontFamily: {
        // Didone display: the high-stroke-contrast drama of a manga chapter
        // title, and a nod to the fashion-plate lettering JoJo borrows from.
        display: ['"Bodoni Moda"', 'Didot', '"Times New Roman"', 'serif'],
        // Brush mincho, used only for kanji set as a graphic element.
        brush: ['"Shippori Mincho B1"', '"Yu Mincho"', '"Hiragino Mincho ProN"', 'serif'],
        // Japanese gothic that also covers Latin, so the HUD and body copy
        // stay in one voice.
        hud: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // A geometric scale derived from 1rem at a ratio near the major third,
        // so headline sizes stay in tune with the HUD text.
        micro: ['0.6875rem', { lineHeight: '1.1', letterSpacing: '0.24em' }],
        label: ['0.8125rem', { lineHeight: '1.25', letterSpacing: '0.14em' }],
        body: ['1rem', { lineHeight: '1.6' }],
        lead: ['1.25rem', { lineHeight: '1.45' }],
        q: ['clamp(1.5rem, 1.1rem + 2.2vw, 2.9rem)', { lineHeight: '1.12' }],
        hero: ['clamp(3.5rem, 1rem + 16vw, 13rem)', { lineHeight: '0.82' }],
        rank: ['clamp(2rem, 0.8rem + 6vw, 5rem)', { lineHeight: '0.95' }],
      },
      screens: {
        xs: '420px',
        tall: { raw: '(min-height: 760px)' },
      },
      zIndex: {
        webgl: '0',
        stage: '10',
        hud: '20',
        feedback: '30',
        wipe: '40',
      },
      transitionTimingFunction: {
        slice: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
