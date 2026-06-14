/**
 * Tests for src/lib/browser.ts cross-browser shim
 */

import { describe, it, expect, afterEach } from 'vitest';

describe('browser shim', () => {
  afterEach(() => {
    // Restore offscreen to the mock value after each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.chrome as any).offscreen = {
      createDocument: globalThis.chrome.offscreen?.createDocument,
      Reason: { WORKERS: 'WORKERS' },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__IS_SAFARI__;
  });

  it('exports scripting and it is defined', async () => {
    const { scripting } = await import('@/lib/browser');
    expect(scripting).toBeDefined();
  });

  it('isSafari() returns false in Chrome environment (offscreen is defined)', async () => {
    // Default test setup: both chrome and browser are set, offscreen is defined
    const { isSafari } = await import('@/lib/browser');
    expect(isSafari()).toBe(false);
  });

  it('isSafari() returns true in Safari environment (browser defined, offscreen undefined)', async () => {
    // Simulate Safari: offscreen is undefined on globalThis.chrome
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.chrome as any).offscreen = undefined;

    // Re-import to pick up modified hasOffscreenSupport behavior
    // Since hasOffscreenSupport checks globalThis.chrome?.offscreen at call time,
    // we can call isSafari() directly without re-importing
    const { isSafari } = await import('@/lib/browser');
    expect(isSafari()).toBe(true);
  });

  it('honors the __IS_SAFARI__ build flag over runtime globals (Chrome build)', async () => {
    // Simulate the real bug environment: Chrome 149 exposes `browser` in the
    // content script AND chrome.offscreen is absent (content-script context).
    // The legacy heuristic would wrongly say Safari; the build flag must win.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.chrome as any).offscreen = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__IS_SAFARI__ = false;

    const { isSafari } = await import('@/lib/browser');
    expect(isSafari()).toBe(false);
  });

  it('honors the __IS_SAFARI__ build flag over runtime globals (Safari build)', async () => {
    // offscreen present (would look like Chrome to the heuristic) but the
    // Safari build flag must force the Safari path.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__IS_SAFARI__ = true;

    const { isSafari } = await import('@/lib/browser');
    expect(isSafari()).toBe(true);
  });
});
