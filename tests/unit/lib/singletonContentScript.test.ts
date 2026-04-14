/**
 * Tests for src/lib/singletonContentScript.ts
 *
 * The helper exists because content scripts can be injected twice into
 * the same isolated world (manifest content_scripts + scripting.executeScript
 * fallback), causing duplicate side effects — see #8 and rules/safari-messaging.md.
 * It ensures the `setup` callback runs exactly once per guard key per window.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { runOnceInContentScript } from '@/lib/singletonContentScript';

function clearGuard(key: string): void {
  const w = window as unknown as Record<string, unknown>;
  delete w[key];
}

describe('runOnceInContentScript', () => {
  const key = '__test_guard_v1';
  // Initialized in beforeEach. MockInstance's default generics
  // (any[], any) are loose but adequate for test-side assertions on
  // call count and the first argument.
  let warnSpy!: MockInstance;

  beforeEach(() => {
    clearGuard(key);
    // Silence the duplicate-injection warning by default so it doesn't
    // pollute stderr during tests that don't assert on it. Tests that
    // care about warn behavior assert against this same spy.
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { /* silence */ });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('runs the setup callback on first call', () => {
    const setup = vi.fn();
    runOnceInContentScript(key, setup);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('does NOT run the setup callback on a second call with the same key', () => {
    const setup = vi.fn();
    runOnceInContentScript(key, setup);
    runOnceInContentScript(key, setup);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('runs independently for different guard keys', () => {
    const setupA = vi.fn();
    const setupB = vi.fn();
    runOnceInContentScript('__test_a_v1', setupA);
    runOnceInContentScript('__test_b_v1', setupB);
    expect(setupA).toHaveBeenCalledTimes(1);
    expect(setupB).toHaveBeenCalledTimes(1);
    clearGuard('__test_a_v1');
    clearGuard('__test_b_v1');
  });

  it('skips setup if the guard flag is pre-set', () => {
    (window as unknown as Record<string, unknown>)[key] = true;
    const setup = vi.fn();
    runOnceInContentScript(key, setup);
    expect(setup).not.toHaveBeenCalled();
  });

  it('leaves the guard flag set to true after running', () => {
    runOnceInContentScript(key, () => { /* noop */ });
    const w = window as unknown as Record<string, unknown>;
    expect(w[key]).toBe(true);
  });

  it('propagates errors from the setup callback so they are not silently swallowed', () => {
    const setup = vi.fn(() => {
      throw new Error('setup boom');
    });
    expect(() => runOnceInContentScript(key, setup)).toThrow('setup boom');
  });

  it('still marks the guard flag even if setup throws, to prevent retry loops on re-injection', () => {
    const setup = vi.fn(() => {
      throw new Error('setup boom');
    });
    expect(() => runOnceInContentScript(key, setup)).toThrow();

    const w = window as unknown as Record<string, unknown>;
    expect(w[key]).toBe(true);

    const setup2 = vi.fn();
    runOnceInContentScript(key, setup2);
    expect(setup2).not.toHaveBeenCalled();
  });

  it('warns on a duplicate call so devs can notice re-injection (#10)', () => {
    runOnceInContentScript(key, () => { /* first */ });
    expect(warnSpy).not.toHaveBeenCalled();

    runOnceInContentScript(key, () => { /* second */ });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const firstCallArgs = warnSpy.mock.calls[0] ?? [];
    const firstArg = String(firstCallArgs[0] ?? '');
    expect(firstArg).toContain(key);
    expect(firstArg).toMatch(/duplicate|re-injection/i);
  });

  it('does NOT warn on the first call', () => {
    runOnceInContentScript(key, () => { /* first */ });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
