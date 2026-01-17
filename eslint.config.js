import js from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Universal
        console: 'readonly',
        process: 'readonly',
        // Browser
        window: 'readonly',
        document: 'readonly',
        alert: 'readonly',
        // Node.js
        __dirname: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      react,
      'react-hooks': reactHooks,
      prettier,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': 'off',
      'prefer-const': 'error',
      'prettier/prettier': 'error',
      // Disable quote rules that conflict with Prettier
      quotes: 'off',
      '@typescript-eslint/quotes': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
  },
];
