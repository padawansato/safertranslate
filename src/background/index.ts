/**
 * Background Service Worker
 * Manages offscreen document lifecycle (Chrome) and direct inference (Safari)
 */

import { runtime, hasOffscreenSupport } from '@/lib/browser';

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

let safariEngineInitialized = false;

async function handleSafariTranslate(message: { type: string; text?: string }): Promise<unknown> {
  const engine = await import('@/services/inference-engine');
  if (!safariEngineInitialized) {
    engine.initInferenceEngine((status, error, progress) => {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_MODEL_STATUS', status, error, progress });
    });
    safariEngineInitialized = true;
  }
  if (message.type === 'OFFSCREEN_TRANSLATE') {
    const translatedText = await engine.handleTranslate(message.text ?? '');
    return { translatedText, sourceText: message.text };
  }
  await engine.getOrCreatePipeline();
  return { success: true };
}

runtime.onInstalled.addListener((details) => {
  console.log('[SaferTranslate] Extension installed:', details.reason);
});

runtime.onMessage.addListener((message, sender, sendResponse) => {
  const fromContentScript = !!(sender as { tab?: unknown }).tab;
  const senderUrl = (sender as { url?: string }).url ?? '';
  const fromOffscreen = senderUrl.includes('offscreen');

  if (fromOffscreen) return false;

  if (fromContentScript && (message.type === 'OFFSCREEN_TRANSLATE' || message.type === 'OFFSCREEN_LOAD_MODEL')) {
    if (hasOffscreenSupport()) {
      // Chrome: relay to offscreen document
      ensureOffscreenDocument()
        .then(() => chrome.runtime.sendMessage(message))
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse({ error: String(error) }));
    } else {
      // Safari: run inference directly in background
      handleSafariTranslate(message)
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse({ error: String(error) }));
    }
    return true;
  }

  return false;
});

console.log('[SaferTranslate] Background service worker started');
