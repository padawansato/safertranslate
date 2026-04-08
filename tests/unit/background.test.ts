/**
 * Background Service Worker Tests
 * Tests offscreen document lifecycle, message relay, and Safari direct inference
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

vi.mock('@/lib/browser', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/browser')>();
  return {
    ...original,
    hasOffscreenSupport: vi.fn().mockReturnValue(true),
  };
});

type MessageListener = (
  message: Record<string, unknown>,
  sender: Record<string, unknown>,
  sendResponse: (response: Record<string, unknown>) => void
) => boolean | undefined;

async function loadBackgroundModule(): Promise<MessageListener> {
  let captured: MessageListener | undefined;
  (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>).mockImplementation(
    (listener: MessageListener) => { captured = listener; }
  );
  await import('@/background/index');
  return captured!;
}

describe('background service worker', () => {
  let messageListener: MessageListener;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    (chrome.runtime.getURL as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => `chrome-extension://mock-id/${path}`
    );
    (chrome.runtime.getContexts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (chrome.offscreen.createDocument as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      translatedText: 'テスト',
      sourceText: 'test',
    });

    // Default: Chrome mode (hasOffscreenSupport = true)
    const { hasOffscreenSupport } = await import('@/lib/browser');
    vi.mocked(hasOffscreenSupport).mockReturnValue(true);

    messageListener = await loadBackgroundModule();
  });

  describe('OFFSCREEN_TRANSLATE relay', () => {
    it('should relay message from content script to offscreen', async () => {
      const sendResponse = vi.fn();
      const keepOpen = messageListener(
        { type: 'OFFSCREEN_TRANSLATE', text: 'Hello', sourceLang: 'en', targetLang: 'ja' },
        { tab: { id: 1 } },  // from content script
        sendResponse
      );

      expect(keepOpen).toBe(true);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'OFFSCREEN_TRANSLATE',
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'ja',
      });
    });

    it('should create offscreen document if not exists', async () => {
      const sendResponse = vi.fn();
      messageListener(
        { type: 'OFFSCREEN_TRANSLATE', text: 'Hello' },
        { tab: { id: 1 } },
        sendResponse
      );

      await vi.waitFor(() => {
        expect(chrome.offscreen.createDocument).toHaveBeenCalled();
      });

      expect(chrome.offscreen.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('offscreen'),
          reasons: expect.arrayContaining(['WORKERS']),
        })
      );
    });

    it('should skip offscreen creation if already exists', async () => {
      (chrome.runtime.getContexts as ReturnType<typeof vi.fn>).mockResolvedValue([
        { contextType: 'OFFSCREEN_DOCUMENT' },
      ]);

      const sendResponse = vi.fn();
      messageListener(
        { type: 'OFFSCREEN_TRANSLATE', text: 'Hello' },
        { tab: { id: 1 } },
        sendResponse
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    });
  });

  describe('OFFSCREEN_LOAD_MODEL relay', () => {
    it('should relay load model message', async () => {
      (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const sendResponse = vi.fn();
      messageListener(
        { type: 'OFFSCREEN_LOAD_MODEL' },
        { tab: { id: 1 } },
        sendResponse
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'OFFSCREEN_LOAD_MODEL' });
    });
  });

  describe('non-offscreen messages', () => {
    it('should not relay TRANSLATE_PAGE messages', () => {
      const sendResponse = vi.fn();
      const result = messageListener(
        { type: 'TRANSLATE_PAGE' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(result).toBe(false);
      expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    });

    it('should not relay messages from offscreen document', () => {
      const sendResponse = vi.fn();
      const result = messageListener(
        { type: 'OFFSCREEN_MODEL_STATUS', status: 'ready' },
        { url: 'chrome-extension://id/offscreen/offscreen.html' },
        sendResponse
      );

      expect(result).toBe(false);
    });
  });

  describe('Safari mode (no offscreen support)', () => {
    beforeEach(async () => {
      vi.resetAllMocks();
      vi.resetModules();
      (chrome.runtime.getURL as ReturnType<typeof vi.fn>).mockImplementation(
        (path: string) => `safari-web-extension://mock-id/${path}`
      );
      mockHandleTranslate.mockResolvedValue('Safari翻訳');
      mockGetOrCreatePipeline.mockResolvedValue({});

      const { hasOffscreenSupport } = await import('@/lib/browser');
      vi.mocked(hasOffscreenSupport).mockReturnValue(false);

      messageListener = await loadBackgroundModule();
    });

    it('should handle OFFSCREEN_TRANSLATE directly via inference engine', async () => {
      const sendResponse = vi.fn();
      const keepOpen = messageListener(
        { type: 'OFFSCREEN_TRANSLATE', text: 'Hello' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(keepOpen).toBe(true);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockHandleTranslate).toHaveBeenCalledWith('Hello');
      expect(sendResponse).toHaveBeenCalledWith({
        translatedText: 'Safari翻訳',
        sourceText: 'Hello',
      });
    });

    it('should handle OFFSCREEN_LOAD_MODEL directly', async () => {
      const sendResponse = vi.fn();
      messageListener(
        { type: 'OFFSCREEN_LOAD_MODEL' },
        { tab: { id: 1 } },
        sendResponse
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockGetOrCreatePipeline).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should NOT create offscreen document', async () => {
      const sendResponse = vi.fn();
      messageListener(
        { type: 'OFFSCREEN_TRANSLATE', text: 'Hello' },
        { tab: { id: 1 } },
        sendResponse
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
    });

    it('should return error when inference fails', async () => {
      mockHandleTranslate.mockRejectedValue(new Error('WASM load error'));

      const sendResponse = vi.fn();
      messageListener(
        { type: 'OFFSCREEN_TRANSLATE', text: 'Hello' },
        { tab: { id: 1 } },
        sendResponse
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(sendResponse).toHaveBeenCalledWith({
        error: expect.stringContaining('WASM load error'),
      });
    });
  });
});
