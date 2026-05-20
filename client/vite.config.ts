import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8585',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    force: true,
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.tsx'],
  },
});
