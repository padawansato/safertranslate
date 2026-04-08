/**
 * Offscreen Document Tests
 * Mocks inference-engine module to test message handling and chrome integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandleTranslate = vi.fn();
const mockGetOrCreatePipeline = vi.fn();
const mockInitInferenceEngine = vi.fn();

vi.mock('@/services/inference-engine', () => ({
  handleTranslate: (...args: unknown[]) => mockHandleTranslate(...args),
  getOrCreatePipeline: (...args: unknown[]) => mockGetOrCreatePipeline(...args),
  initInferenceEngine: (...args: unknown[]) => mockInitInferenceEngine(...args),
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
    mockHandleTranslate.mockResolvedValue('テスト翻訳');
    mockGetOrCreatePipeline.mockResolvedValue({});
    messageListener = await loadOffscreenModule();
  });

  describe('initialization', () => {
    it('should call initInferenceEngine with a status callback', () => {
      expect(mockInitInferenceEngine).toHaveBeenCalledTimes(1);
      expect(typeof mockInitInferenceEngine.mock.calls[0]?.[0]).toBe('function');
    });

    it('should send chrome message when status callback is invoked', () => {
      const statusCallback = mockInitInferenceEngine.mock.calls[0]?.[0] as
        (status: string, error?: string) => void;
      statusCallback('ready');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'OFFSCREEN_MODEL_STATUS',
        status: 'ready',
        error: undefined,
      });
    });
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

    it('should call handleTranslate with the message text', async () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_TRANSLATE', text: 'Hello' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockHandleTranslate).toHaveBeenCalledWith('Hello');
    });

    it('should return error when translation fails', async () => {
      mockHandleTranslate.mockRejectedValue(new Error('Model load failed'));

      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_TRANSLATE', text: 'Hello' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(sendResponse).toHaveBeenCalledWith({
        error: expect.stringContaining('Model load failed'),
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

    it('should return error when model load fails', async () => {
      mockGetOrCreatePipeline.mockRejectedValue(new Error('WASM error'));

      const sendResponse = vi.fn();
      messageListener({ type: 'OFFSCREEN_LOAD_MODEL' }, {}, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(sendResponse).toHaveBeenCalledWith({ error: 'Error: WASM error' });
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
