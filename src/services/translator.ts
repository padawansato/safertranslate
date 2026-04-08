/**
 * Translation Router
 * Dispatches translation requests to the configured provider
 */

import type { TranslationRequest, TranslationResponse, TranslationProviderType } from './types';
import { getProvider } from './settings';
import { myMemoryProvider } from './providers/mymemory';
import { localLlmProvider } from './providers/local-llm';

const providers = {
  'mymemory': myMemoryProvider,
  'local-llm': localLlmProvider,
} as const;

function getProviderInstance(name: TranslationProviderType) {
  return providers[name];
}

export async function translate(
  text: string,
  options?: Partial<TranslationRequest>
): Promise<TranslationResponse> {
  const providerName = await getProvider();
  const provider = getProviderInstance(providerName);
  return provider.translate(text, options);
}

export async function translateBatch(
  texts: string[],
  options?: Partial<TranslationRequest>
): Promise<TranslationResponse[]> {
  const providerName = await getProvider();
  const provider = getProviderInstance(providerName);
  const results: TranslationResponse[] = [];
  const DELAY_MS = 100;

  for (const text of texts) {
    const result = await provider.translate(text, options);
    results.push(result);

    if (providerName === 'mymemory' && texts.indexOf(text) < texts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

export type { TranslationRequest, TranslationResponse };
