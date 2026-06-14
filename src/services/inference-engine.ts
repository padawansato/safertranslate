/**
 * Inference Engine - Shared module for Transformers.js model loading and inference
 * Uses dynamic import so the window polyfill runs BEFORE Transformers.js loads.
 */

// Polyfill: Safari background runs as service_worker (no `window` global).
// Must run before Transformers.js is imported (hence dynamic import below).
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
}

// v3 types: use generic function type to avoid complex union issues
type TranslationPipelineFn = (text: string, options?: Record<string, unknown>) => Promise<Array<{ translation_text: string }>>;

// m2m100_418M (multilingual, q8) — chosen for en->ja quality. Smaller /
// more-aggressively-quantized alternatives were evaluated and rejected (quality
// or WASM-backend limits). The heavy first-run download is instead hidden by
// PREFETCHING the model before first use (see src/background/index.ts).
// Multilingual model → handleTranslate() passes src_lang/tgt_lang.
export const MODEL_ID = 'Xenova/m2m100_418M';

export type StatusChangeCallback = (
  status: 'loading' | 'ready' | 'error',
  error?: string,
  progress?: { file: string; progress: number },
) => void;

let translationPipeline: TranslationPipelineFn | null = null;
let loadingPromise: Promise<TranslationPipelineFn> | null = null;
let onStatusChange: StatusChangeCallback | undefined;
let wasmConfigured = false;

export function initInferenceEngine(callback?: StatusChangeCallback): void {
  onStatusChange = callback;
}

async function loadPipeline(): Promise<TranslationPipelineFn> {
  const { pipeline, env } = await import('@huggingface/transformers');

  if (!wasmConfigured && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
    env.backends.onnx.wasm.numThreads = 1;
    wasmConfigured = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipe = await (pipeline as any)('translation', MODEL_ID, {
    progress_callback: (event: { status: string; file?: string; progress?: number }) => {
      if (event.status === 'progress' && event.file && event.progress !== undefined) {
        onStatusChange?.('loading', undefined, { file: event.file, progress: event.progress });
      }
    },
  });
  return pipe as TranslationPipelineFn;
}

export async function getOrCreatePipeline(): Promise<TranslationPipelineFn> {
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
  // m2m100 is multilingual → pass explicit language hints. (Must stay in sync
  // with MODEL_ID: a pair-specific model would be called with text only.)
  const result = await pipe(text, { src_lang: 'en', tgt_lang: 'ja' });
  return (result as Array<{ translation_text: string }>)[0]?.translation_text ?? '';
}
