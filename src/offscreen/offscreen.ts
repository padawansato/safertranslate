/**
 * Offscreen Document - Transformers.js Translation Engine
 * Runs MarianMT model inference in an isolated offscreen context
 * Delegates to shared inference-engine module
 */

import { initInferenceEngine, getOrCreatePipeline, handleTranslate } from '@/services/inference-engine';

// Pass status callback that sends chrome messages (offscreen-specific)
initInferenceEngine((status, error, progress) => {
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_MODEL_STATUS', status, error, progress });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OFFSCREEN_TRANSLATE') {
    handleTranslate(message.text)
      .then((translatedText) => sendResponse({ translatedText, sourceText: message.text }))
      .catch((err) => sendResponse({ error: err instanceof Error ? err.message : String(err) }));
    return true;
  }

  if (message.type === 'OFFSCREEN_LOAD_MODEL') {
    getOrCreatePipeline()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }

  return false;
});

console.log('[SaferTranslate] Offscreen document loaded');
