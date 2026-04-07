/**
 * Visual Regression Tests for SaferTranslate
 * Captures screenshots at key states to detect visual regressions.
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, '../../dist');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const serviceWorkers = context.serviceWorkers();
  let worker = serviceWorkers.find((w) => w.url().includes('chrome-extension://'));
  if (!worker) {
    worker = await context.waitForEvent('serviceworker', { timeout: 10000 });
  }
  extensionId = worker.url().split('/')[2]!;
});

test.afterAll(async () => {
  await context.close();
});

test('popup initial state', async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await popup.waitForLoadState('domcontentloaded');

  await expect(popup).toHaveScreenshot('popup-initial.png', {
    maxDiffPixelRatio: 0.01,
  });

  await popup.close();
});

test('page before translation', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:3333/sample-page.html');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  await expect(page).toHaveScreenshot('page-before-translation.png', {
    maxDiffPixelRatio: 0.01,
  });

  await page.close();
});

test('page after translation with bilingual display', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:3333/sample-page.html');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Use extension page to send translate message to content script.
  // Bring test page to front so it's the "active" tab for tabs.query.
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await helper.waitForLoadState('domcontentloaded');
  await page.bringToFront();
  await page.waitForTimeout(200);

  await helper.evaluate(async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'TRANSLATE_PAGE' });
    }
  });
  await helper.close();

  // Wait for translation boxes to appear and all batches to finish
  await page.waitForSelector('.safertranslate-box', { timeout: 30000 });
  await page.waitForTimeout(3000);

  await expect(page).toHaveScreenshot('page-after-translation.png', {
    maxDiffPixelRatio: 0.02,
  });

  await page.close();
});
