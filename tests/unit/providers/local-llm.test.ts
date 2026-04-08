/**
 * Local LLM Provider Tests
 * Tests the message relay to offscreen document
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { localLlmProvider } from '@/services/providers/local-llm';

describe('localLlmProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should have name "local-llm"', () => {
    expect(localLlmProvider.name).toBe('local-llm');
  });

  describe('isAvailable', () => {
    it('should return true when chrome.offscreen exists', async () => {
      expect(await localLlmProvider.isAvailable()).toBe(true);
    });

    it('should return false when chrome.offscreen is undefined', async () => {
      const original = globalThis.chrome.offscreen;
      // @ts-expect-error - Testing undefined offscreen
      globalThis.chrome.offscreen = undefined;

      expect(await localLlmProvider.isAvailable()).toBe(false);

      globalThis.chrome.offscreen = original;
    });
  });

  describe('translate', () => {
    it('should send message and return translation', async () => {
      (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedText: 'こんにちは',
        sourceText: 'Hello',
      });

      const result = await localLlmProvider.translate('Hello');

      expect(result).toEqual({
        translatedText: 'こんにちは',
        sourceText: 'Hello',
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'OFFSCREEN_TRANSLATE',
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'ja',
      });
    });

    it('should return empty string for empty input', async () => {
      const result = await localLlmProvider.translate('');

      expect(result).toEqual({
        translatedText: '',
        sourceText: '',
      });
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should return empty string for whitespace-only input', async () => {
      const result = await localLlmProvider.translate('   ');

      expect(result).toEqual({
        translatedText: '',
        sourceText: '   ',
      });
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should use custom language pair', async () => {
      (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        translatedText: 'Bonjour',
        sourceText: 'Hello',
      });

      await localLlmProvider.translate('Hello', { sourceLang: 'en', targetLang: 'fr' });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'OFFSCREEN_TRANSLATE',
        text: 'Hello',
        sourceLang: 'en',
        targetLang: 'fr',
      });
    });

    it('should throw error when response contains error', async () => {
      (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: 'Model load failed',
      });

      await expect(localLlmProvider.translate('Hello')).rejects.toMatchObject({
        code: 'LOCAL_LLM_ERROR',
        message: 'Model load failed',
      });
    });
  });
});
