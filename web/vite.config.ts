import { defineConfig } from 'vitest/config';
import solid from '@solidjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      '@game': path.resolve(__dirname, '../src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    root: path.resolve(__dirname, '..'),
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'web/src/**/*.test.tsx'],
  },
});
