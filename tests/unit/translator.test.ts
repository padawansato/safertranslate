/**
 * Translator Router Tests
 * Tests that the router dispatches to the correct provider based on settings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock settings before importing translator
vi.mock('@/services/settings', () => ({
  getProvider: vi.fn().mockResolvedValue('mymemory'),
}));

vi.mock('@/services/providers/mymemory', () => ({
  myMemoryProvider: {
    name: 'mymemory',
    translate: vi.fn().mockResolvedValue({
      translatedText: 'MyMemory翻訳',
      sourceText: 'Hello',
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/services/providers/local-llm', () => ({
  localLlmProvider: {
    name: 'local-llm',
    translate: vi.fn().mockResolvedValue({
      translatedText: 'LLM翻訳',
      sourceText: 'Hello',
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
  },
}));

import { translate, translateBatch } from '@/services/translator';
import { getProvider } from '@/services/settings';
import { myMemoryProvider } from '@/services/providers/mymemory';
import { localLlmProvider } from '@/services/providers/local-llm';

describe('translator router', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProvider).mockResolvedValue('mymemory');
    vi.mocked(myMemoryProvider.translate).mockResolvedValue({
      translatedText: 'MyMemory翻訳',
      sourceText: 'Hello',
    });
    vi.mocked(localLlmProvider.translate).mockResolvedValue({
      translatedText: 'LLM翻訳',
      sourceText: 'Hello',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('translate', () => {
    it('should dispatch to mymemory provider by default', async () => {
      const result = await translate('Hello');

      expect(getProvider).toHaveBeenCalledOnce();
      expect(myMemoryProvider.translate).toHaveBeenCalledWith('Hello', undefined);
      expect(result.translatedText).toBe('MyMemory翻訳');
    });

    it('should dispatch to local-llm provider when configured', async () => {
      vi.mocked(getProvider).mockResolvedValue('local-llm');

      const result = await translate('Hello');

      expect(localLlmProvider.translate).toHaveBeenCalledWith('Hello', undefined);
      expect(result.translatedText).toBe('LLM翻訳');
    });

    it('should pass options to provider', async () => {
      const options = { sourceLang: 'en', targetLang: 'fr' };
      await translate('Hello', options);

      expect(myMemoryProvider.translate).toHaveBeenCalledWith('Hello', options);
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts with the configured provider', async () => {
      vi.mocked(myMemoryProvider.translate)
        .mockResolvedValueOnce({ translatedText: 'こんにちは', sourceText: 'Hello' })
        .mockResolvedValueOnce({ translatedText: '世界', sourceText: 'World' });

      const results = await translateBatch(['Hello', 'World']);

      expect(results).toHaveLength(2);
      expect(results[0]?.translatedText).toBe('こんにちは');
      expect(results[1]?.translatedText).toBe('世界');
      // getProvider should be called only once for the batch
      expect(getProvider).toHaveBeenCalledOnce();
    });

    it('should handle empty array', async () => {
      const results = await translateBatch([]);

      expect(results).toHaveLength(0);
    });

    it('should use local-llm provider for batch when configured', async () => {
      vi.mocked(getProvider).mockResolvedValue('local-llm');
      vi.mocked(localLlmProvider.translate)
        .mockResolvedValueOnce({ translatedText: 'LLM1', sourceText: 'Hello' })
        .mockResolvedValueOnce({ translatedText: 'LLM2', sourceText: 'World' });

      const results = await translateBatch(['Hello', 'World']);

      expect(results).toHaveLength(2);
      expect(localLlmProvider.translate).toHaveBeenCalledTimes(2);
      expect(myMemoryProvider.translate).not.toHaveBeenCalled();
    });
  });
});
