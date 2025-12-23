/**
 * Playwright Configuration for SaferTranslate E2E Tests
 * Configures browser testing for Chrome extension
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Global test timeout
  timeout: 60 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000,
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry tests on CI
  retries: process.env.CI ? 2 : 0,
  
  // Number of worker processes
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports' }],
    ['json', { outputFile: 'tests/e2e/results.json' }],
    ['junit', { outputFile: 'tests/e2e/junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Global setup/teardown
  globalSetup: './tests/e2e/global-setup.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'https://example.com',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Action timeout
    actionTimeout: 10 * 1000,
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Test projects for different browsers/scenarios
  projects: [
    {
      name: 'chrome-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome-specific options for extension testing
        channel: 'chrome',
        launchOptions: {
          args: [
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
          ],
        },
      },
    },
    
    // Additional projects for different scenarios
    {
      name: 'chrome-headless',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          headless: true,
          args: [
            '--no-first-run',
            '--no-default-browser-check',
          ],
        },
      },
    },
    
    // Edge testing (if available)
    {
      name: 'edge-extension',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        launchOptions: {
          args: [
            '--no-first-run',
            '--no-default-browser-check',
          ],
        },
      },
    },
  ],

  // Web server for testing (disabled for extension testing)
  // webServer: {
  //   command: 'npm run test:server',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },

  // Output directories
  outputDir: 'tests/e2e/test-results',
  
  // Metadata for reports
  metadata: {
    project: 'SaferTranslate',
    version: '0.1.0',
    testType: 'E2E Extension Testing',
    environment: process.env.NODE_ENV || 'test',
  },
});