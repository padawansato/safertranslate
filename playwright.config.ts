import { defineConfig } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 0,
  workers: 1, // Chrome extensions require single worker
  reporter: 'html',

  use: {
    headless: false, // Extensions require headed mode
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        // Chrome extension testing configuration
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
  ],

  // Web server for test fixtures
  webServer: {
    command: 'npx serve tests/fixtures -p 3333 -L',
    port: 3333,
    reuseExistingServer: !process.env.CI,
  },
});
