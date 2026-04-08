/**
 * Local LLM Translation Provider
 * Relays translation requests to the offscreen document via background SW
 */

import type { TranslationProvider, TranslationRequest, TranslationResponse } from '../types';
import { runtime } from '@/lib/browser';

const DEFAULT_SOURCE_LANG = 'en';
const DEFAULT_TARGET_LANG = 'ja';

export const localLlmProvider: TranslationProvider = {
  name: 'local-llm',

  async translate(text: string, options?: Partial<TranslationRequest>): Promise<TranslationResponse> {
    if (!text.trim()) {
      return { translatedText: '', sourceText: text };
    }

    const sourceLang = options?.sourceLang ?? DEFAULT_SOURCE_LANG;
    const targetLang = options?.targetLang ?? DEFAULT_TARGET_LANG;

    const response = await runtime.sendMessage({
      type: 'OFFSCREEN_TRANSLATE',
      text,
      sourceLang,
      targetLang,
    });

    if (response?.error) {
      throw { code: 'LOCAL_LLM_ERROR', message: response.error };
    }

    return {
      translatedText: response.translatedText,
      sourceText: text,
    };
  },

  async isAvailable(): Promise<boolean> {
    return typeof globalThis.chrome?.offscreen !== 'undefined';
  },
};
