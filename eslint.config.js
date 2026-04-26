import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Import boundary: primitives must not import features, stores, or renderer
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@features/*', '@stores/*', '@renderer/*'],
            message: 'Primitives must not import from features, stores, or renderer. This enforces the architectural layer boundary.',
          },
          {
            group: ['**/features/*', '**/stores/*', '**/renderer/*'],
            message: 'Primitives must not import from features, stores, or renderer (relative path). Use path aliases and respect the layer boundary.',
          },
        ],
      }],
    },
  },
  // Override: features and stores CAN import from anywhere in src
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/stores/**/*.{ts,tsx}', 'src/renderer/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/App.tsx', 'src/main.tsx', 'src/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
