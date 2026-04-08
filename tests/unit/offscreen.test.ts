/**
 * Offscreen Document Tests
 * Mocks Transformers.js to test message handling and pipeline lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPipeline = vi.fn();
const mockTranslate = vi.fn();

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: {
    backends: {
      onnx: {
        wasm: { wasmPaths: '' },
      },
    },
  },
}));

type MessageListener = (
  message: Record<string, unknown>,
  sender: Record<string, unknown>,
  sendResponse: (response: Record<string, unknown>) => void
) => boolean | undefined;

async function loadOffscreenModule(): Promise<MessageListener> {
  let captured: MessageListener | undefined;
  (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>).mockImplementation(
    (listener: MessageListener) => { captured = listener; }
  );
  // Fresh import each time (vi.resetModules clears cache)
  await import('@/offscreen/offscreen');
  return captured!;
}

describe('offscreen document', () => {
  let messageListener: MessageListener;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    mockPipeline.mockResolvedValue(mockTranslate);
    mockTranslate.mockResolvedValue([{ translation_text: 'テスト翻訳' }]);
    messageListener = await loadOffscreenModule();
  });

  describe('OFFSCREEN_TRANSLATE', () => {
    it('should translate text and send response', async () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_TRANSLATE', text: 'Hello' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(sendResponse).toHaveBeenCalledWith({
        translatedText: 'テスト翻訳',
        sourceText: 'Hello',
      });
    });

    it('should create pipeline with correct model on first request', async () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_TRANSLATE', text: 'Hello' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockPipeline).toHaveBeenCalledWith(
        'translation',
        'Helsinki-NLP/opus-mt-en-ja',
        { dtype: 'q8' }
      );
    });

    it('should return error when model load fails', async () => {
      mockPipeline.mockRejectedValue(new Error('Model load failed'));

      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_TRANSLATE', text: 'Hello' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Model load failed',
      });
    });
  });

  describe('OFFSCREEN_LOAD_MODEL', () => {
    it('should preload model and respond with success', async () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_LOAD_MODEL' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('unknown messages', () => {
    it('should return false for unknown message types', () => {
      const sendResponse = vi.fn();
      const result = messageListener({ type: 'UNKNOWN' }, {}, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });
});
