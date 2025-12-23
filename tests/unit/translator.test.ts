/**
 * Translator Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translate, translateBatch } from '@/services/translator';

describe('translator', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        responseData: {
          translatedText: 'こんにちは',
          match: 1,
        },
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await translate('Hello');

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
      const result = await translate('');

      expect(result).toEqual({
        translatedText: '',
        sourceText: '',
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return empty string for whitespace-only input', async () => {
      const result = await translate('   ');

      expect(result).toEqual({
        translatedText: '',
        sourceText: '   ',
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use custom language pair', async () => {
      const mockResponse = {
        responseData: {
          translatedText: 'Bonjour',
          match: 1,
        },
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await translate('Hello', { sourceLang: 'en', targetLang: 'fr' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('langpair=en%7Cfr')
      );
    });

    it('should throw error when quota is exceeded', async () => {
      const mockResponse = {
        responseData: {
          translatedText: '',
          match: 0,
        },
        quotaFinished: true,
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(translate('Hello')).rejects.toMatchObject({
        code: 'QUOTA_EXCEEDED',
      });
    });

    it('should throw error for HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(translate('Hello')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: expect.stringContaining('500'),
      });
    });

    it('should throw error for network failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(translate('Hello')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network error',
      });
    });

    it('should throw error for API error response', async () => {
      const mockResponse = {
        responseData: {
          translatedText: '',
          match: 0,
        },
        responseStatus: 403,
        responseDetails: 'Invalid language pair',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(translate('Hello')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: 'Invalid language pair',
      });
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const mockResponses = [
        { responseData: { translatedText: 'こんにちは', match: 1 }, responseStatus: 200 },
        { responseData: { translatedText: '世界', match: 1 }, responseStatus: 200 },
      ];

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        const response = mockResponses[callCount];
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        });
      });

      const results = await translateBatch(['Hello', 'World']);

      expect(results).toHaveLength(2);
      expect(results[0]?.translatedText).toBe('こんにちは');
      expect(results[1]?.translatedText).toBe('世界');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      const results = await translateBatch([]);

      expect(results).toHaveLength(0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should skip empty strings in batch', async () => {
      const mockResponse = {
        responseData: { translatedText: 'こんにちは', match: 1 },
        responseStatus: 200,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await translateBatch(['Hello', '', 'World']);

      expect(results).toHaveLength(3);
      expect(results[0]?.translatedText).toBe('こんにちは');
      expect(results[1]?.translatedText).toBe('');
      expect(results[2]?.translatedText).toBe('こんにちは');
      expect(fetch).toHaveBeenCalledTimes(2); // Empty string doesn't call API
    });
  });
});
