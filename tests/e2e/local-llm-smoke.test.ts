/**
 * Smoke test: verify translation works in Chrome with both providers.
 * Separates Chrome vs Safari issues.
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
  console.log('Extension ID:', extensionId);
});

test.afterAll(async () => {
  await context.close();
});

test('MyMemory API translation works in Chrome', async () => {
  const page = await context.newPage();
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('http://localhost:3333/sample-page.html');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Verify content script loaded
  const hasLoadLog = logs.some((log) => log.includes('SaferTranslate'));
  console.log('Content script loaded:', hasLoadLog);
  console.log('Console logs:', logs);

  // Trigger translation via helper page (same pattern as visual.test.ts)
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await helper.waitForLoadState('domcontentloaded');
  await page.bringToFront();
  await page.waitForTimeout(200);

  // Default provider is mymemory. Under the new protocol the content
  // script acks immediately with TRANSLATION_STARTED and streams
  // progress via runtime.sendMessage — so we wait for TRANSLATION_COMPLETE
  // inside the helper before closing it.
  await helper.evaluate(async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', activeTab?.id, activeTab?.url);
    if (!activeTab?.id) return;

    const completed = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TRANSLATION_COMPLETE timeout')), 55000);
      const onMessage = (msg: { type?: string }): void => {
        if (msg?.type === 'TRANSLATION_COMPLETE' || msg?.type === 'TRANSLATION_FAILED') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(onMessage);
          resolve();
        }
      };
      chrome.runtime.onMessage.addListener(onMessage);
    });

    const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'TRANSLATE_PAGE' });
    console.log('Translation ack:', JSON.stringify(response));
    await completed;
    console.log('Translation complete received');
  });
  await helper.close();

  // Boxes should already be present; short timeout is enough.
  await page.waitForSelector('.safertranslate-box', { timeout: 5000 });
  const boxCount = await page.locator('.safertranslate-box').count();
  console.log('Translation boxes:', boxCount);
  expect(boxCount).toBeGreaterThan(0);

  // Check content is Japanese
  const firstBox = await page.locator('.safertranslate-box').first().textContent();
  console.log('First translation:', firstBox);
  expect(firstBox).toBeTruthy();

  await page.close();
});

test('Local LLM translation works in Chrome', async () => {
  // m2m100 (~475MB) downloads on first run; allow generous wall-clock.
  test.setTimeout(200000);

  // Monitor service worker console
  const swWorkers = context.serviceWorkers();
  for (const sw of swWorkers) {
    sw.on('console', (msg) => console.log(`[SW] ${msg.text()}`));
  }
  context.on('console', (msg) => console.log(`[CTX] ${msg.text()}`));

  const page = await context.newPage();
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('http://localhost:3333/sample-page.html');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Switch to local-llm provider via helper
  const helper = await context.newPage();
  await helper.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await helper.waitForLoadState('domcontentloaded');

  // Set provider to local-llm
  await helper.evaluate(async () => {
    await chrome.storage.local.set({ settings: { provider: 'local-llm' } });
    const result = await chrome.storage.local.get('settings');
    console.log('Provider set to:', JSON.stringify(result));
  });

  await page.bringToFront();
  await page.waitForTimeout(200);

  // Check offscreen document and service worker state
  const swLogs = await helper.evaluate(async () => {
    // Try to directly test WASM in extension context
    try {
      const wasmUrl = chrome.runtime.getURL('wasm/');
      const testUrl = wasmUrl + 'ort-wasm-simd-threaded.mjs';
      const res = await fetch(testUrl);
      console.log('WASM mjs fetch:', res.status, res.statusText);
    } catch (e) {
      console.error('WASM fetch failed:', e);
    }

    // Check storage setting
    const settings = await chrome.storage.local.get('settings');
    console.log('Current settings:', JSON.stringify(settings));

    return 'done';
  });
  console.log('SW check:', swLogs);

  // Trigger translation and wait for the REAL terminal event. The model
  // (~475MB m2m100) downloads on first run, so allow a generous timeout.
  // NOTE: a previous version asserted `expect(true).toBe(true)` here, which
  // silently hid local-llm regressions (the test stayed "green" even when no
  // translation boxes were produced). This test now fails if no boxes appear.
  const outcome = await helper.evaluate(async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', activeTab?.id, activeTab?.url);
    if (!activeTab?.id) return { error: 'no active tab' };

    const terminal = new Promise<{ type: string }>((resolve) => {
      const timer = setTimeout(() => resolve({ type: 'CLIENT_TIMEOUT' }), 150000);
      const onMessage = (msg: { type?: string }): void => {
        if (msg?.type === 'TRANSLATION_COMPLETE' || msg?.type === 'TRANSLATION_FAILED') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(onMessage);
          resolve({ type: msg.type });
        }
      };
      chrome.runtime.onMessage.addListener(onMessage);
    });

    const ack = await chrome.tabs.sendMessage(activeTab.id, { type: 'TRANSLATE_PAGE' });
    console.log('LLM Translation ack:', JSON.stringify(ack));
    const result = await terminal;
    console.log('LLM terminal:', JSON.stringify(result));
    return { ack, result };
  });
  console.log('Outcome:', JSON.stringify(outcome));
  await helper.close();

  await page.waitForTimeout(500);
  const boxCount = await page.locator('.safertranslate-box').count();
  console.log('LLM Translation boxes:', boxCount);
  expect(boxCount).toBeGreaterThan(0);

  const firstBox = await page.locator('.safertranslate-box').first().textContent();
  console.log('First LLM translation:', firstBox);
  expect(firstBox).toBeTruthy();

  await page.close();
});
