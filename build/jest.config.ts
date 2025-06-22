/**
 * Jest Configuration for SaferTranslate
 * Optimized for Clean Architecture and TDD development
 */

import type { Config } from 'jest';

const config: Config = {
  displayName: 'SaferTranslate',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  
  // Root directories
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
    '<rootDir>/automation'
  ],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/tmp/',
    '.d.ts$'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Path mapping from tsconfig.json
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@automation/(.*)$': '<rootDir>/automation/$1',
    '^@build/(.*)$': '<rootDir>/build/$1',
    // Additional mappings for assets and CSS
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/mocks/fileMock.js'
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strict: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/presentation/**/*.ts', // UI components have different testing strategy
    '!src/**/*.config.ts',
    '!src/**/*.types.ts'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],

  // Coverage thresholds (strict for TDD)
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Domain layer should have 100% coverage
    'src/domain/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    // Application layer should have near-perfect coverage
    'src/application/**/*.ts': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },

  // Performance and timeout settings
  testTimeout: 10000,
  maxWorkers: '50%',
  maxConcurrency: 5,

  // Reporter configuration
  reporters: ['default'],

  // Module resolution
  extensionsToTreatAsEsm: ['.ts'],

  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Verbose output for CI
  verbose: process.env.CI === 'true',

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.git/'
  ],

  // Error handling
  errorOnDeprecated: true,
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'https://localhost:3000'
  },


  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Snapshot configuration
  snapshotSerializers: []
};

export default config;