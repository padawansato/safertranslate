/**
 * E2E smoke test for the `test-stub` translation provider.
 *
 * The stub is intentionally not exposed in the popup UI — it's selected by
 * seeding `chrome.storage.local.settings.provider = 'test-stub'` before the
 * translate flow runs. This test proves the full pipeline
 * (popup → content script → translator → provider → DOM injector) works
 * without network (MyMemory) or a ~150MB model download (local-llm),
 * which makes CI / dev iteration much cheaper.
 *
 * Success signal: translation boxes appear AND at least one carries the
 * `[stub]` marker injected by the stub provider for unknown inputs, which
 * uniquely identifies this provider as the one that ran.
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

test('test-stub provider translates the sample page end-to-end', async () => {
  const page = await context.newPage();
  await page.goto('http://localhost:3333/sample-page.html');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);

  // Select test-stub via storage, bypassing the popup dropdown (the stub
  // is not exposed in the HTML select on purpose).
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await helper.waitForLoadState('domcontentloaded');
  await helper.evaluate(async () => {
    await chrome.storage.local.set({ settings: { provider: 'test-stub' } });
  });

  await page.bringToFront();
  await page.waitForTimeout(200);

  // Same async protocol as local-llm-smoke: content script acks immediately
  // and streams progress; wait for TRANSLATION_COMPLETE before closing helper.
  await helper.evaluate(async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) throw new Error('no active tab');

    const completed = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TRANSLATION_COMPLETE timeout')), 10000);
      const onMessage = (msg: { type?: string }): void => {
        if (msg?.type === 'TRANSLATION_COMPLETE' || msg?.type === 'TRANSLATION_FAILED') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(onMessage);
          resolve();
        }
      };
      chrome.runtime.onMessage.addListener(onMessage);
    });

    await chrome.tabs.sendMessage(activeTab.id, { type: 'TRANSLATE_PAGE' });
    await completed;
  });
  await helper.close();

  await page.waitForSelector('.safertranslate-box', { timeout: 5000 });
  const boxCount = await page.locator('.safertranslate-box').count();
  expect(boxCount).toBeGreaterThan(0);

  // The sample page text is not in the stub dictionary, so every
  // translation should carry the `[stub]` marker — proving our stub ran
  // and not some other provider.
  const texts = await page.locator('.safertranslate-box').allTextContents();
  const stubCount = texts.filter((t) => t.includes('[stub]')).length;
  expect(stubCount).toBeGreaterThan(0);

  await page.close();
});
