/**
 * MyMemory Provider Tests
 * Moved from translator.test.ts to test the extracted provider directly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { myMemoryProvider } from '@/services/providers/mymemory';

describe('myMemoryProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have name "mymemory"', () => {
    expect(myMemoryProvider.name).toBe('mymemory');
  });

  it('should always be available', async () => {
    expect(await myMemoryProvider.isAvailable()).toBe(true);
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        responseData: { translatedText: 'こんにちは', match: 1 },
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await myMemoryProvider.translate('Hello');

      expect(result).toEqual({
        translatedText: 'こんにちは',
        sourceText: 'Hello',
      });
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.mymemory.translated.net')
      );
    });

    it('should return empty string for empty input', async () => {
      const result = await myMemoryProvider.translate('');

      expect(result).toEqual({
        translatedText: '',
        sourceText: '',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return empty string for whitespace-only input', async () => {
      const result = await myMemoryProvider.translate('   ');

      expect(result).toEqual({
        translatedText: '',
        sourceText: '   ',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use custom language pair', async () => {
      const mockResponse = {
        responseData: { translatedText: 'Bonjour', match: 1 },
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await myMemoryProvider.translate('Hello', { sourceLang: 'en', targetLang: 'fr' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('langpair=en%7Cfr')
      );
    });

    it('should throw error when quota is exceeded', async () => {
      const mockResponse = {
        responseData: { translatedText: '', match: 0 },
        quotaFinished: true,
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(myMemoryProvider.translate('Hello')).rejects.toMatchObject({
        code: 'QUOTA_EXCEEDED',
      });
    });

    it('should throw error for HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(myMemoryProvider.translate('Hello')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: expect.stringContaining('500'),
      });
    });

    it('should throw error for network failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(myMemoryProvider.translate('Hello')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network error',
      });
    });

    it('should throw error for API error response', async () => {
      const mockResponse = {
        responseData: { translatedText: '', match: 0 },
        responseStatus: 403,
        responseDetails: 'Invalid language pair',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(myMemoryProvider.translate('Hello')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: 'Invalid language pair',
      });
    });
  });
});
