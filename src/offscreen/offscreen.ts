/**
 * Offscreen Document - Transformers.js Translation Engine
 * Runs MarianMT model inference in an isolated offscreen context
 */

import { pipeline, env } from '@huggingface/transformers';
import type { TranslationPipeline } from '@huggingface/transformers';

// Configure WASM paths to use locally bundled files
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
}

const MODEL_ID = 'Helsinki-NLP/opus-mt-en-ja';

let translationPipeline: TranslationPipeline | null = null;
let loadingPromise: Promise<TranslationPipeline> | null = null;

/**
 * Get or create the translation pipeline (lazy, deduplicated)
 * Uses Promise sharing: concurrent requests await the same loading Promise
 */
async function getOrCreatePipeline(): Promise<TranslationPipeline> {
  if (translationPipeline) return translationPipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline('translation', MODEL_ID, { dtype: 'q8' })
    .then((pipe) => {
      translationPipeline = pipe as TranslationPipeline;
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_MODEL_STATUS', status: 'ready' });
      return translationPipeline;
    })
    .catch((error) => {
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_MODEL_STATUS',
        status: 'error',
        error: error instanceof Error ? error.message : 'Model load failed',
      });
      throw error;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

async function handleTranslate(text: string): Promise<string> {
  const pipe = await getOrCreatePipeline();
  const result = await pipe(text);
  return (result as Array<{ translation_text: string }>)[0]?.translation_text ?? '';
}

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
