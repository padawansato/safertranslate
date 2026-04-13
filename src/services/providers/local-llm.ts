/**
 * Local LLM Translation Provider
 * Chrome: relays to offscreen document via background SW
 * Safari: loads inference-engine.js at runtime via chrome.runtime.getURL and
 * runs Transformers.js inference directly in the content script (Safari SW
 * does not support dynamic import(), but content scripts — even classic —
 * do support it as a runtime expression).
 */

import type { TranslationProvider, TranslationRequest, TranslationResponse } from '../types';
import { runtime, isSafari } from '@/lib/browser';

const DEFAULT_SOURCE_LANG = 'en';
const DEFAULT_TARGET_LANG = 'ja';

type SafariEngine = { handleTranslate: (text: string) => Promise<string> };
let safariEnginePromise: Promise<SafariEngine> | null = null;

async function getSafariEngine(): Promise<SafariEngine> {
  if (safariEnginePromise) return safariEnginePromise;
  const url = chrome.runtime.getURL('inference-engine.js');
  safariEnginePromise = import(/* @vite-ignore */ url) as Promise<SafariEngine>;
  return safariEnginePromise;
}

async function translateViaSafari(text: string): Promise<TranslationResponse> {
  const engine = await getSafariEngine();
  const translatedText = await engine.handleTranslate(text);
  return { translatedText, sourceText: text };
}

async function translateViaBackground(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResponse> {
  const response = await runtime.sendMessage({
    type: 'OFFSCREEN_TRANSLATE',
    text,
    sourceLang,
    targetLang,
  });

  if (response?.error) {
    throw { code: 'LOCAL_LLM_ERROR', message: response.error };
  }

  return { translatedText: response.translatedText, sourceText: text };
}

export const localLlmProvider: TranslationProvider = {
  name: 'local-llm',

  async translate(text: string, options?: Partial<TranslationRequest>): Promise<TranslationResponse> {
    if (!text.trim()) {
      return { translatedText: '', sourceText: text };
    }

    if (isSafari()) {
      return translateViaSafari(text);
    }

    const sourceLang = options?.sourceLang ?? DEFAULT_SOURCE_LANG;
    const targetLang = options?.targetLang ?? DEFAULT_TARGET_LANG;
    return translateViaBackground(text, sourceLang, targetLang);
  },

  async isAvailable(): Promise<boolean> {
    return true;
  },
};
