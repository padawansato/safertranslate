/**
 * Debug: Trigger local LLM translation and capture full error from offscreen.
 */

import { test, chromium, type BrowserContext } from '@playwright/test';
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

test('debug: send OFFSCREEN_TRANSLATE directly and get full error', async () => {
  const helper = await context.newPage();
  helper.on('console', (msg) => console.log(`[HELPER:${msg.type()}]`, msg.text()));

  await helper.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await helper.waitForLoadState('domcontentloaded');

  // Set provider to local-llm
  await helper.evaluate(async () => {
    await chrome.storage.local.set({ settings: { provider: 'local-llm' } });
  });

  // Send OFFSCREEN_TRANSLATE directly to background (bypasses content script)
  const result = await helper.evaluate(async () => {
    try {
      console.log('Sending OFFSCREEN_TRANSLATE to background...');
      const response = await chrome.runtime.sendMessage({
        type: 'OFFSCREEN_TRANSLATE',
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'ja',
      });
      console.log('Response:', JSON.stringify(response));
      return response;
    } catch (e) {
      const err = e as Error;
      console.error('Full error:', err.message);
      return { error: err.message, stack: err.stack };
    }
  });

  console.log('=== FULL RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  await helper.close();
});
