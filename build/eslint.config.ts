/**
 * ESLint Configuration for SaferTranslate
 * Clean Architecture + TDD optimized rules
 */

import { defineConfig } from 'eslint-define-config';

export default defineConfig({
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
    jest: true
  },
  
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: '.'
  },
  
  plugins: [
    '@typescript-eslint',
    'prettier'
  ],
  
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    
    // Clean Architecture specific rules
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['../infrastructure/*'],
          message: 'Domain and Application layers cannot import from Infrastructure layer'
        },
        {
          group: ['../presentation/*'],
          message: 'Domain, Application, and Infrastructure layers cannot import from Presentation layer'
        }
      ]
    }],
    
    // General code quality rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'prefer-destructuring': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-constructor': 'error',
    'no-useless-return': 'error',
    'no-return-await': 'error',
    'require-await': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Naming conventions
    'camelcase': 'off', // Handled by @typescript-eslint/naming-convention
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I']
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase']
      },
      {
        selector: 'enum',
        format: ['PascalCase']
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      },
      {
        selector: 'class',
        format: ['PascalCase']
      },
      {
        selector: 'method',
        format: ['camelCase']
      },
      {
        selector: 'function',
        format: ['camelCase']
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      }
    ],
    
    // Prettier integration
    'prettier/prettier': 'error'
  },
  
  overrides: [
    // Domain layer - strictest rules
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        'complexity': ['error', 5],
        'max-lines-per-function': ['error', 30]
      }
    },
    
    // Application layer - strict rules
    {
      files: ['src/application/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        'complexity': ['error', 8],
        'max-lines-per-function': ['error', 50]
      }
    },
    
    // Infrastructure layer - more lenient for external integrations
    {
      files: ['src/infrastructure/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'complexity': ['error', 15]
      }
    },
    
    // Presentation layer - UI specific rules
    {
      files: ['src/presentation/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': 'off',
        'complexity': ['error', 12]
      }
    },
    
    // Test files - relaxed rules
    {
      files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/unbound-method': 'off',
        'max-lines-per-function': 'off',
        'complexity': 'off',
        'no-console': 'off'
      }
    },
    
    // Automation scripts - relaxed rules for tooling
    {
      files: ['automation/**/*.ts', 'build/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        'complexity': 'off'
      }
    },
    
    // Configuration files
    {
      files: ['*.config.ts', '*.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off'
      }
    }
  ],
  
  ignorePatterns: [
    'dist/',
    'build/tmp/',
    'coverage/',
    'node_modules/',
    '*.d.ts',
    'src/presentation/safari-extension/**/*.swift'
  ]
});