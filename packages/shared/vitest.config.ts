import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      exclude: ['**/db-schema.ts', '**/node_modules/**'],
      include: ['src/**/*.{ts,tsx,js,jsx}'],
    },
  },
});
