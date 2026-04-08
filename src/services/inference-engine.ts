/**
 * Inference Engine - Shared module for Transformers.js model loading and inference
 * Uses dynamic import so the window polyfill runs BEFORE Transformers.js loads.
 */

// Polyfill: Safari background runs as service_worker (no `window` global).
// Must run before Transformers.js is imported (hence dynamic import below).
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
}

// Only import the TYPE (erased at runtime, no hoisting issue)
import type { TranslationPipeline } from '@huggingface/transformers';

export const MODEL_ID = 'Xenova/m2m100_418M';

export type StatusChangeCallback = (
  status: 'loading' | 'ready' | 'error',
  error?: string,
  progress?: { file: string; progress: number },
) => void;

let translationPipeline: TranslationPipeline | null = null;
let loadingPromise: Promise<TranslationPipeline> | null = null;
let onStatusChange: StatusChangeCallback | undefined;
let wasmConfigured = false;

export function initInferenceEngine(callback?: StatusChangeCallback): void {
  onStatusChange = callback;
}

async function loadPipeline(): Promise<TranslationPipeline> {
  const { pipeline, env } = await import('@huggingface/transformers');

  if (!wasmConfigured && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
    env.backends.onnx.wasm.numThreads = 1;
    wasmConfigured = true;
  }

  return pipeline('translation', MODEL_ID, {
    progress_callback: (event: { status: string; file?: string; progress?: number }) => {
      if (event.status === 'progress' && event.file && event.progress !== undefined) {
        onStatusChange?.('loading', undefined, { file: event.file, progress: event.progress });
      }
    },
  }) as Promise<TranslationPipeline>;
}

export async function getOrCreatePipeline(): Promise<TranslationPipeline> {
  if (translationPipeline) return translationPipeline;
  if (loadingPromise) return loadingPromise;

  onStatusChange?.('loading');

  loadingPromise = loadPipeline()
    .then((pipe) => {
      translationPipeline = pipe;
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

export async function handleTranslate(text: string): Promise<string> {
  const pipe = await getOrCreatePipeline();
  const result = await pipe(text, { src_lang: 'en', tgt_lang: 'ja' });
  return (result as Array<{ translation_text: string }>)[0]?.translation_text ?? '';
}
