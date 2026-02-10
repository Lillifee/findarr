import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  /* -------------------------------------------------- */
  /* Global ignores */
  /* -------------------------------------------------- */
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
      'eslint.config.js',
    ],
  },

  /* -------------------------------------------------- */
  /* Base JS + TS rules (ALL packages) */
  /* -------------------------------------------------- */
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  prettierConfig,

  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Disable base rules covered by TS
      'no-unused-vars': 'off',

      // General
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-duplicate-imports': 'error',
    },
  },

  /* -------------------------------------------------- */
  /* Shared */
  /* -------------------------------------------------- */
  {
    files: ['shared/**/*.{ts,js}'],
    languageOptions: {
      globals: {},
    },
  },

  /* -------------------------------------------------- */
  /* Server */
  /* -------------------------------------------------- */
  {
    files: ['server/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  /* -------------------------------------------------- */
  /* Client */
  /* -------------------------------------------------- */
  {
    files: ['client/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  /* -------------------------------------------------- */
  /* Tooling configs */
  /* -------------------------------------------------- */
  {
    files: ['client/vite.config.ts', 'server/**/*.config.ts', '**/*.config.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
