/**
 * Integration test: real model translation
 * Downloads and runs the actual Xenova/m2m100_418M model.
 * Skipped in CI (slow, requires network). Run manually: npx vitest run tests/integration/
 */

import { describe, it, expect } from 'vitest';
import { pipeline } from '@huggingface/transformers';
import { MODEL_ID } from '@/services/inference-engine';

describe.skipIf(process.env.CI === 'true')('real model translation', () => {
  it('should translate English to Japanese using actual model', async () => {
    const translator = await pipeline('translation', MODEL_ID);
    const result = await translator('Hello', { src_lang: 'en', tgt_lang: 'ja' });
    const text = (result as Array<{ translation_text: string }>)[0]?.translation_text ?? '';

    expect(text).toBeTruthy();
    expect(text).not.toBe('Hello');
    console.log(`"Hello" → "${text}"`);
  }, 300_000);

  it('should use the correct model ID', () => {
    expect(MODEL_ID).toBe('Xenova/m2m100_418M');
  });
});
