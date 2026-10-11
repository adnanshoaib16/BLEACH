import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    cssTarget: 'chrome100',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Three.js and its post-processing addons are by far the heaviest
        // dependency. Splitting them out keeps the app chunk small enough to
        // parse before the first paint, so the landing copy appears while the
        // WebGL layer is still arriving.
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'framer-motion'],
        },
      },
    },
  },
});
