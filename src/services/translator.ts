/**
 * Translation Service
 * Abstracts translation API calls with support for multiple providers
 */

import type { TranslationRequest, TranslationResponse, TranslationError } from './types';

/**
 * MyMemory API response structure
 */
interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished?: boolean;
  responseDetails?: string;
  responseStatus: number;
}

/**
 * Translation service configuration
 */
interface TranslatorConfig {
  baseUrl: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
}

const DEFAULT_CONFIG: TranslatorConfig = {
  baseUrl: 'https://api.mymemory.translated.net/get',
  defaultSourceLang: 'en',
  defaultTargetLang: 'ja',
};

/**
 * Translate a single text string
 */
export async function translate(
  text: string,
  options?: Partial<TranslationRequest>
): Promise<TranslationResponse> {
  const sourceLang = options?.sourceLang ?? DEFAULT_CONFIG.defaultSourceLang;
  const targetLang = options?.targetLang ?? DEFAULT_CONFIG.defaultTargetLang;

  // Skip empty text
  if (!text.trim()) {
    return {
      translatedText: '',
      sourceText: text,
    };
  }

  const url = new URL(DEFAULT_CONFIG.baseUrl);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${sourceLang}|${targetLang}`);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw createTranslationError(
        'API_ERROR',
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as MyMemoryResponse;

    // Check for quota exceeded
    if (data.quotaFinished) {
      throw createTranslationError(
        'QUOTA_EXCEEDED',
        'Translation quota exceeded. Please try again later.'
      );
    }

    // Check for API errors
    if (data.responseStatus !== 200) {
      throw createTranslationError(
        'API_ERROR',
        data.responseDetails ?? 'Unknown API error'
      );
    }

    return {
      translatedText: data.responseData.translatedText,
      sourceText: text,
    };
  } catch (error) {
    if (isTranslationError(error)) {
      throw error;
    }

    throw createTranslationError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/**
 * Translate multiple texts in batch
 * Note: MyMemory doesn't have batch API, so we make sequential requests with delay
 */
export async function translateBatch(
  texts: string[],
  options?: Partial<TranslationRequest>
): Promise<TranslationResponse[]> {
  const results: TranslationResponse[] = [];
  const DELAY_MS = 100; // Small delay to avoid rate limiting

  for (const text of texts) {
    const result = await translate(text, options);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    if (texts.indexOf(text) < texts.length - 1) {
      await delay(DELAY_MS);
    }
  }

  return results;
}

/**
 * Create a typed translation error
 */
function createTranslationError(code: string, message: string): TranslationError {
  return { code, message };
}

/**
 * Type guard for TranslationError
 */
function isTranslationError(error: unknown): error is TranslationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Utility function for delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Export types for use in other modules
 */
export type { TranslationRequest, TranslationResponse, TranslationError };
