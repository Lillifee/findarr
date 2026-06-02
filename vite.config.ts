import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*.{js,jsx,ts,tsx}': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    sortImports: true,
    sortTailwindcss: true,
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    plugins: ['eslint', 'typescript', 'react', 'react-perf', 'oxc', 'import', 'promise', 'vitest'],
    // Todo add more jsx-a11y

    options: { typeAware: true, typeCheck: true },

    env: {
      browser: true,
      es2024: true,
      node: true,
    },

    categories: {
      correctness: 'error',
      suspicious: 'error',
      pedantic: 'error',
      // perf: 'warn',
      // style: 'warn'
    },
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',

      'vitest/no-conditional-expect': 'off',

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

      // typeAware. TODO check which category
      'typescript/prefer-readonly-parameter-types': 'off',
    },
  },
  run: {
    cache: true,
  },
});
