import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import noOnmessageReturnFalse from './eslint-rules/no-onmessage-return-false.js';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        Node: 'readonly',
        HTMLElement: 'readonly',
      },
    },
    plugins: {
      'safer-translate': {
        rules: {
          'no-onmessage-return-false': noOnmessageReturnFalse,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'safer-translate/no-onmessage-return-false': 'error',
    },
  }
);
