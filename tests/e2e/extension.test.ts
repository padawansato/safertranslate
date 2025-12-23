/**
 * E2E Tests for SaferTranslate Chrome Extension
 */

import { test, expect, chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, '../../dist');

test('SaferTranslate extension works correctly', async () => {
  // Launch browser with extension
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    // Test 1: Extension loads successfully
    let extensionId: string | undefined;

    const serviceWorkers = context.serviceWorkers();
    for (const worker of serviceWorkers) {
      const url = worker.url();
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('/')[2];
        break;
      }
    }

    if (!extensionId) {
      const worker = await context.waitForEvent('serviceworker', { timeout: 10000 });
      const url = worker.url();
      extensionId = url.split('/')[2];
    }

    expect(extensionId).toBeDefined();

    // Test 2: Page navigation and content check
    const page = await context.newPage();
    const response = await page.goto('http://localhost:3333/sample-page.html', { timeout: 10000 });
    expect(response?.status()).toBe(200);

    await page.waitForLoadState('domcontentloaded');

    // Check page has expected content
    const h1 = await page.locator('h1').textContent({ timeout: 5000 });
    expect(h1).toBe('Welcome to the Test Page');

    const paragraphCount = await page.locator('p').count();
    expect(paragraphCount).toBeGreaterThan(0);

    // Test 3: Content script logs its loading
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.reload({ timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const hasLoadLog = logs.some((log) => log.includes('SaferTranslate'));
    expect(hasLoadLog).toBe(true);

    await page.close();
  } finally {
    await context.close();
  }
});
