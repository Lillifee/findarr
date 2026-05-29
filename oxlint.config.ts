import { defineConfig } from 'oxlint';

export default defineConfig({
  env: {
    browser: true,
    node: true,
    es2024: true,
  },
  plugins: ['eslint', 'typescript', 'react', 'react-perf', 'oxc', 'import', 'promise', 'vitest'],
  // todo add more vitest, jsx-a11y

  categories: {
    correctness: 'error',
    suspicious: 'error',
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'oxc/no-async-endpoint-handlers': 'off',
    'eslint/no-unused-vars': 'error',
    'typescript/no-explicit-any': 'error',
  },
});
