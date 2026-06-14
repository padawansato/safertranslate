/**
 * Verifies that selecting the local-llm provider triggers a BACKGROUND model
 * prefetch (warming the cache before the first "Translate" click), so the user
 * isn't blocked on a multi-hundred-MB download at click time.
 *
 * Positive signal: the background SW logs the prefetch kickoff. We use a fresh
 * profile (so no persisted setting triggers prefetch at startup) and select
 * local-llm via the popup dropdown AFTER attaching the SW console listener, then
 * assert the prefetch fired. We do NOT wait for the (heavy) download to finish —
 * the kickoff is the thing under test; the load path itself is covered by the
 * smoke test.
 */

import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, '../../dist');

test('selecting local-llm provider triggers a background model prefetch', async () => {
  test.setTimeout(60000);

  const swLogs: string[] = [];
  const context: BrowserContext = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    const attach = (sw: Worker): void => {
      sw.on('console', (msg) => swLogs.push(msg.text()));
    };
    context.on('serviceworker', attach);
    let worker = context.serviceWorkers().find((w) => w.url().includes('chrome-extension://'));
    if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 10000 });
    attach(worker);
    const extensionId = worker.url().split('/')[2]!;

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await popup.waitForLoadState('domcontentloaded');

    // Fresh profile defaults to mymemory → no startup prefetch. Selecting
    // local-llm via the dropdown must kick off the prefetch.
    await popup.selectOption('#provider-select', 'local-llm');

    await expect
      .poll(() => swLogs.join('\n'), { timeout: 20000 })
      .toContain('Prefetching local-llm model');

    await popup.close();
  } finally {
    await context.close();
  }
});
