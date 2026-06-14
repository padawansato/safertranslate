/**
 * Background Service Worker
 * Manages offscreen document lifecycle (Chrome) and direct inference (Safari)
 */

import { runtime, hasOffscreenSupport } from '@/lib/browser';
import { getSettings } from '@/services/settings';

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

/**
 * Pre-download & cache the local-llm model BEFORE first use, so the first
 * "Translate" click isn't blocked on a multi-hundred-MB download.
 *
 * Chrome only: the offscreen document loads the pipeline, and Transformers.js
 * caches the ONNX weights in Cache Storage — persisting across SW restarts, so
 * the first real translation reads from cache. Safari loads on demand in the
 * content script (no persistent offscreen), so prefetch is a no-op there.
 *
 * Fired when the user selects the local-llm provider (PREFETCH_LOCAL_LLM from
 * the popup) and on SW install/startup if local-llm is already the saved
 * provider. Guarded so the heavy download starts at most once per SW lifetime.
 */
let prefetchStarted = false;
async function prefetchLocalLlmModel(): Promise<void> {
  if (!hasOffscreenSupport()) return; // Safari: model loads on first translate
  if (prefetchStarted) return;
  prefetchStarted = true;
  console.log('[SaferTranslate] Prefetching local-llm model (warming cache)');
  try {
    await ensureOffscreenDocument();
    await chrome.runtime.sendMessage({ type: 'OFFSCREEN_LOAD_MODEL' });
  } catch (error) {
    prefetchStarted = false; // allow a later trigger to retry
    console.warn('[SaferTranslate] Model prefetch failed:', error);
  }
}

async function prefetchIfLocalLlmSelected(): Promise<void> {
  try {
    const { provider } = await getSettings();
    if (provider === 'local-llm') void prefetchLocalLlmModel();
  } catch {
    /* settings unavailable — skip prefetch */
  }
}

runtime.onInstalled.addListener((details) => {
  console.log('[SaferTranslate] Extension installed:', details.reason);
  void prefetchIfLocalLlmSelected();
});

runtime.onStartup?.addListener(() => {
  void prefetchIfLocalLlmSelected();
});

runtime.onMessage.addListener((message, sender, sendResponse) => {
  const fromContentScript = !!(sender as { tab?: unknown }).tab;
  const senderUrl = (sender as { url?: string }).url ?? '';
  const fromOffscreen = senderUrl.includes('offscreen');

  if (fromOffscreen) return false;

  // Prefetch request from the popup (provider switched to local-llm). Kick off
  // the background model download; no response needed.
  if (message.type === 'PREFETCH_LOCAL_LLM') {
    void prefetchLocalLlmModel();
    return false;
  }

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

// SW (re)started: if local-llm is the saved provider, warm the model cache now.
void prefetchIfLocalLlmSelected();
