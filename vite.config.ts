import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite config for the React renderer.
 * Output goes to dist/renderer/ which Electron loads as a file:// URL.
 */
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',                     // relative paths so file:// URLs work
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['electron'],     // do not bundle electron internals
    },
  },
  resolve: {
    alias: {
      '@core':        path.resolve(__dirname, 'src/core'),
      '@calculators': path.resolve(__dirname, 'src/calculators'),
      '@data':        path.resolve(__dirname, 'src/data'),
      '@renderer':    path.resolve(__dirname, 'src/renderer'),
    },
  },
});
