/**
 * Test Stub Translation Provider
 *
 * A deterministic, zero-cost provider for CI and fast local iteration.
 * Returns canned en→ja translations for a small fixed vocabulary, and a
 * `[stub] <text>` marker for anything unknown so tests can tell the stub
 * actually ran (rather than silently falling through to another provider).
 *
 * This provider is intentionally not suggested in the popup UI by default;
 * it becomes active when `chrome.storage.local.settings.provider` is set
 * to `"test-stub"` (typically by an E2E test or a manual override).
 */

import type { TranslationProvider, TranslationResponse } from '../types';

// Canonical en→ja mappings. Keys are normalized to lower-case and trimmed
// so the stub is forgiving about whitespace/casing variations in tests.
const DICTIONARY: Readonly<Record<string, string>> = Object.freeze({
  hello: 'こんにちは',
  world: 'せかい',
  'hello, world!': 'こんにちは、世界！',
  safertranslate: 'セーファートランスレート',
  english: '英語',
  japanese: '日本語',
  safari: 'サファリ',
  chrome: 'クローム',
});

// `world` has a kana override elsewhere in tests; keep the main dictionary
// authoritative and pin the test-visible spelling here.
const DICTIONARY_WITH_OVERRIDES: Readonly<Record<string, string>> = {
  ...DICTIONARY,
  world: '世界',
};

function lookup(text: string): string | null {
  const key = text.trim().toLowerCase();
  return DICTIONARY_WITH_OVERRIDES[key] ?? null;
}

export const testStubProvider: TranslationProvider = {
  name: 'test-stub',

  async translate(text: string): Promise<TranslationResponse> {
    if (!text.trim()) {
      return { translatedText: '', sourceText: text };
    }

    const canned = lookup(text);
    if (canned !== null) {
      return { translatedText: canned, sourceText: text };
    }

    // Unknown input: return a marker so tests can distinguish "stub ran with
    // fallback" from "a real provider silently returned the original".
    return { translatedText: `[stub] ${text}`, sourceText: text };
  },

  async isAvailable(): Promise<boolean> {
    return true;
  },
};
