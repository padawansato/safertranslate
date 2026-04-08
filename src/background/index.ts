/**
 * Background Service Worker
 * Manages offscreen document lifecycle and message relay
 */

import { runtime } from '@/lib/browser';

let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (existingContexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: 'Run Transformers.js ML model inference for translation',
  });

  await creatingOffscreen;
  creatingOffscreen = null;
}

runtime.onInstalled.addListener((details) => {
  console.log('[SaferTranslate] Extension installed:', details.reason);
});

runtime.onMessage.addListener((message, sender, sendResponse) => {
  const fromContentScript = !!(sender as { tab?: unknown }).tab;
  const senderUrl = (sender as { url?: string }).url ?? '';
  const fromOffscreen = senderUrl.includes('offscreen');

  // Don't relay messages from offscreen document (prevent loops)
  if (fromOffscreen) return false;

  if (fromContentScript && (message.type === 'OFFSCREEN_TRANSLATE' || message.type === 'OFFSCREEN_LOAD_MODEL')) {
    ensureOffscreenDocument()
      .then(() => chrome.runtime.sendMessage(message))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ error: String(error) }));
    return true;
  }

  return false;
});

console.log('[SaferTranslate] Background service worker started');
