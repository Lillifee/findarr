import { defineConfig } from 'oxlint';

export default defineConfig({
  env: {
    browser: true,
    es2024: true,
    node: true,
  },
  plugins: ['eslint', 'typescript', 'react', 'react-perf', 'oxc', 'import', 'promise', 'vitest'],
  // Todo add more jsx-a11y

  categories: {
    correctness: 'error',
    suspicious: 'error',
    pedantic: 'warn',
    // perf: 'warn',
    // style: 'warn'
  },
  rules: {
    // TODO check if we can remove some of them once the categories are properly set up
    'eslint/no-unused-vars': 'error',
    'oxc/no-async-endpoint-handlers': 'off',
    'react/react-in-jsx-scope': 'off',
    'typescript/no-explicit-any': 'error',

    // pedantic
    'max-lines': 'off',
    'max-lines-per-function': 'off',
    'import/max-dependencies': 'off',
    'vitest/no-conditional-in-test': 'off',
    'no-warning-comments': 'off',
  },
});
