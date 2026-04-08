/**
 * Direct browser test: does Transformers.js work in a regular browser page?
 * No extension involved - pure browser environment.
 */

import { test, chromium } from '@playwright/test';

test('Transformers.js works in plain browser page', async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log(`[PAGE:${msg.type()}]`, msg.text()));

  await page.goto('http://localhost:3333/llm-test.html');

  await page.waitForFunction(
    () => {
      const el = document.getElementById('log');
      return el && (el.textContent?.includes('Result:') || el.textContent?.includes('ERROR:'));
    },
    { timeout: 300000 },
  );

  const logText = await page.locator('#log').textContent();
  console.log('=== FINAL LOG ===');
  console.log(logText);

  await browser.close();
});
