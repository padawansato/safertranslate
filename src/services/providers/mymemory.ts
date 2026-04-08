/**
 * MyMemory Translation Provider
 * Uses the free MyMemory API for translation
 */

import type { TranslationProvider, TranslationRequest, TranslationResponse, TranslationError } from '../types';

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished?: boolean;
  responseDetails?: string;
  responseStatus: number;
}

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.mymemory.translated.net/get',
  defaultSourceLang: 'en',
  defaultTargetLang: 'ja',
};

export const myMemoryProvider: TranslationProvider = {
  name: 'mymemory',

  async translate(text: string, options?: Partial<TranslationRequest>): Promise<TranslationResponse> {
    const sourceLang = options?.sourceLang ?? DEFAULT_CONFIG.defaultSourceLang;
    const targetLang = options?.targetLang ?? DEFAULT_CONFIG.defaultTargetLang;

    if (!text.trim()) {
      return { translatedText: '', sourceText: text };
    }

    const url = new URL(DEFAULT_CONFIG.baseUrl);
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', `${sourceLang}|${targetLang}`);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw createError('API_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as MyMemoryResponse;

      if (data.quotaFinished) {
        throw createError('QUOTA_EXCEEDED', 'Translation quota exceeded. Please try again later.');
      }

      if (data.responseStatus !== 200) {
        throw createError('API_ERROR', data.responseDetails ?? 'Unknown API error');
      }

      return {
        translatedText: data.responseData.translatedText,
        sourceText: text,
      };
    } catch (error) {
      if (isTranslationError(error)) {
        throw error;
      }
      throw createError('NETWORK_ERROR', error instanceof Error ? error.message : 'Network request failed');
    }
  },

  async isAvailable(): Promise<boolean> {
    return true;
  },
};

function createError(code: string, message: string): TranslationError {
  return { code, message };
}

function isTranslationError(error: unknown): error is TranslationError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}
