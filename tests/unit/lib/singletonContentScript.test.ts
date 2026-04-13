/**
 * Tests for src/lib/singletonContentScript.ts
 *
 * The helper exists because content scripts can be injected twice into
 * the same isolated world (manifest content_scripts + scripting.executeScript
 * fallback), causing duplicate side effects — see #8 and rules/safari-messaging.md.
 * It ensures the `setup` callback runs exactly once per guard key per window.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runOnceInContentScript } from '@/lib/singletonContentScript';

function clearGuard(key: string): void {
  const w = window as unknown as Record<string, unknown>;
  delete w[key];
}

describe('runOnceInContentScript', () => {
  const key = '__test_guard_v1';

  beforeEach(() => {
    clearGuard(key);
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
});
