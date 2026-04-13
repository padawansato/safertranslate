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

// OPUS-MT en->ja model is much smaller (~150MB) than m2m100_418M (~475MB)
// and loads significantly faster. Quality is lower but acceptable for testing
// and most practical use cases. Being language-pair specific, it does not
// require src_lang/tgt_lang parameters at inference time.
export const MODEL_ID = 'Xenova/opus-mt-en-jap';

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
  // OPUS-MT en->ja is language-pair specific; call with text only.
  const result = await pipe(text);
  return (result as Array<{ translation_text: string }>)[0]?.translation_text ?? '';
}
