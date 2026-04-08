/**
 * Inference Engine - Shared module for Transformers.js model loading and inference
 * Extracted from offscreen.ts so it can be reused across Chrome offscreen and Safari contexts
 */

import { pipeline, env } from '@huggingface/transformers';
import type { TranslationPipeline } from '@huggingface/transformers';

// Configure WASM paths to use locally bundled files
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
}

const MODEL_ID = 'Helsinki-NLP/opus-mt-en-ja';

type StatusChangeCallback = (status: 'loading' | 'ready' | 'error', error?: string) => void;

let translationPipeline: TranslationPipeline | null = null;
let loadingPromise: Promise<TranslationPipeline> | null = null;
let onStatusChange: StatusChangeCallback | undefined;

/**
 * Initialize the inference engine with an optional status change callback.
 * Decouples notification logic (e.g. chrome.runtime.sendMessage) from the engine.
 */
export function initInferenceEngine(callback?: StatusChangeCallback): void {
  onStatusChange = callback;
}

/**
 * Get or create the translation pipeline (lazy, deduplicated).
 * Uses Promise sharing: concurrent requests await the same loading Promise.
 */
export async function getOrCreatePipeline(): Promise<TranslationPipeline> {
  if (translationPipeline) return translationPipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline('translation', MODEL_ID, { dtype: 'q8' })
    .then((pipe) => {
      translationPipeline = pipe as TranslationPipeline;
      onStatusChange?.('ready');
      return translationPipeline;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Model load failed';
      onStatusChange?.('error', message);
      throw error;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/**
 * Translate text using the pipeline, loading the model if needed.
 */
export async function handleTranslate(text: string): Promise<string> {
  const pipe = await getOrCreatePipeline();
  const result = await pipe(text);
  return (result as Array<{ translation_text: string }>)[0]?.translation_text ?? '';
}
