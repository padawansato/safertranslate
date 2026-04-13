/**
 * Inference Engine Tests
 * Tests the shared inference-engine module extracted from offscreen.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPipelineFn = vi.fn();
const mockTranslate = vi.fn();

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipelineFn(...args),
  env: {
    backends: {
      onnx: {
        wasm: { wasmPaths: '' },
      },
    },
  },
}));

async function loadFreshModule() {
  const mod = await import('@/services/inference-engine');
  return mod;
}

describe('inference-engine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    mockPipelineFn.mockResolvedValue(mockTranslate);
    mockTranslate.mockResolvedValue([{ translation_text: 'テスト翻訳' }]);
  });

  describe('handleTranslate', () => {
    it('should return translated text', async () => {
      const { initInferenceEngine, handleTranslate } = await loadFreshModule();
      initInferenceEngine();

      const result = await handleTranslate('Hello');

      expect(result).toBe('テスト翻訳');
    });

    it('should call pipeline without src_lang/tgt_lang (OPUS-MT is en->ja pair-specific)', async () => {
      const { initInferenceEngine, handleTranslate } = await loadFreshModule();
      initInferenceEngine();

      await handleTranslate('Hello');

      // OPUS-MT models are language-pair specific; no need for src_lang/tgt_lang
      expect(mockTranslate).toHaveBeenCalledWith('Hello');
    });

    it('should propagate errors from failed model load', async () => {
      mockPipelineFn.mockRejectedValue(new Error('WASM load failed'));
      const { initInferenceEngine, handleTranslate } = await loadFreshModule();
      initInferenceEngine();

      await expect(handleTranslate('Hello')).rejects.toThrow('WASM load failed');
    });
  });

  describe('getOrCreatePipeline', () => {
    it('should create pipeline with correct model ID', async () => {
      const { initInferenceEngine, getOrCreatePipeline } = await loadFreshModule();
      initInferenceEngine();

      await getOrCreatePipeline();

      expect(mockPipelineFn).toHaveBeenCalledWith(
        'translation',
        'Xenova/opus-mt-en-jap',
        expect.objectContaining({ progress_callback: expect.any(Function) })
      );
    });

    it('should cache pipeline and not call pipeline factory twice', async () => {
      const { initInferenceEngine, getOrCreatePipeline } = await loadFreshModule();
      initInferenceEngine();

      await getOrCreatePipeline();
      await getOrCreatePipeline();

      expect(mockPipelineFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('onStatusChange callback', () => {
    it('should call onStatusChange with ready on successful load', async () => {
      const statusCallback = vi.fn();
      const { initInferenceEngine, getOrCreatePipeline } = await loadFreshModule();
      initInferenceEngine(statusCallback);

      await getOrCreatePipeline();

      expect(statusCallback).toHaveBeenCalledWith('ready');
    });

    it('should call onStatusChange with error on failed load', async () => {
      mockPipelineFn.mockRejectedValue(new Error('Network error'));
      const statusCallback = vi.fn();
      const { initInferenceEngine, getOrCreatePipeline } = await loadFreshModule();
      initInferenceEngine(statusCallback);

      await expect(getOrCreatePipeline()).rejects.toThrow('Network error');

      expect(statusCallback).toHaveBeenCalledWith('error', 'Network error');
    });

    it('should work without a callback (no errors thrown)', async () => {
      const { initInferenceEngine, getOrCreatePipeline } = await loadFreshModule();
      initInferenceEngine();

      await expect(getOrCreatePipeline()).resolves.toBeDefined();
    });
  });
});
