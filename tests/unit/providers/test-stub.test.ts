/**
 * Tests for src/services/providers/test-stub.ts
 *
 * The stub exists so CI and local fast iteration can exercise the
 * translate flow end-to-end without paying the MyMemory API roundtrip or
 * a ~150MB Transformers.js model download. It returns deterministic
 * canned translations for a small fixed English vocabulary, and a
 * predictable `[stub] …` marker for anything unknown so tests can still
 * detect that the stub ran (and didn't accidentally fall through to a
 * real provider).
 */
import { describe, it, expect } from 'vitest';
import { testStubProvider } from '@/services/providers/test-stub';

describe('testStubProvider', () => {
  it('has the name "test-stub"', () => {
    expect(testStubProvider.name).toBe('test-stub');
  });

  it('is always available — no external dependency to check', async () => {
    expect(await testStubProvider.isAvailable()).toBe(true);
  });

  describe('translate', () => {
    it('returns canned translation for "Hello"', async () => {
      const result = await testStubProvider.translate('Hello');
      expect(result).toEqual({
        translatedText: 'こんにちは',
        sourceText: 'Hello',
      });
    });

    it('returns canned translation for "World"', async () => {
      const result = await testStubProvider.translate('World');
      expect(result.translatedText).toBe('世界');
    });

    it('matches case-insensitively for canned entries', async () => {
      const lower = await testStubProvider.translate('hello');
      const upper = await testStubProvider.translate('HELLO');
      expect(lower.translatedText).toBe('こんにちは');
      expect(upper.translatedText).toBe('こんにちは');
    });

    it('tolerates surrounding whitespace for canned entries', async () => {
      const result = await testStubProvider.translate('  Hello  ');
      expect(result.translatedText).toBe('こんにちは');
      expect(result.sourceText).toBe('  Hello  ');
    });

    it('returns "[stub] <text>" for unknown input so the stub is detectable', async () => {
      const result = await testStubProvider.translate('This sentence is not in the dictionary.');
      expect(result.translatedText).toBe('[stub] This sentence is not in the dictionary.');
    });

    it('returns empty translation for empty input', async () => {
      const result = await testStubProvider.translate('');
      expect(result).toEqual({ translatedText: '', sourceText: '' });
    });

    it('returns empty translation for whitespace-only input', async () => {
      const result = await testStubProvider.translate('   ');
      expect(result.translatedText).toBe('');
      expect(result.sourceText).toBe('   ');
    });

    it('resolves synchronously-ish (under 5ms) — suitable for CI iteration', async () => {
      const start = performance.now();
      await testStubProvider.translate('Hello');
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5);
    });

    it('ignores options.sourceLang / targetLang — the dictionary is en→ja only', async () => {
      const result = await testStubProvider.translate('Hello', {
        sourceLang: 'en',
        targetLang: 'fr',
      });
      expect(result.translatedText).toBe('こんにちは');
    });
  });
});
