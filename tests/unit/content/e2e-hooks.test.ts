/**
 * Tests for src/content/e2e-hooks.ts
 *
 * Hooks let Safari/Chrome E2E trigger a translation without clicking the
 * popup button. Two entry points are exposed:
 *   - URL query `?safertranslate_test=1` → auto-trigger on load
 *   - window.postMessage `{ type: 'SAFERTRANSLATE_TEST_TRIGGER' }` → trigger now
 *
 * Both call a caller-supplied `trigger` callback. The hooks live separate
 * from content/index.ts so we can unit-test them with fake Window objects
 * instead of fighting jsdom's readonly `location` and single-shot load.
 */
import { describe, it, expect, vi } from 'vitest';
import { setupE2EHooks, TEST_QUERY_PARAM_FLAG, TEST_TRIGGER_MESSAGE_TYPE } from '@/content/e2e-hooks';

type Listeners = Record<string, Array<EventListener>>;

function mockWindow(opts: { search?: string; readyState?: DocumentReadyState } = {}): {
  w: Window;
  listeners: Listeners;
} {
  const listeners: Listeners = {};
  const w = {
    location: { search: opts.search ?? '' },
    document: { readyState: opts.readyState ?? 'loading' },
    addEventListener(type: string, listener: EventListener): void {
      (listeners[type] ??= []).push(listener);
    },
  } as unknown as Window;
  return { w, listeners };
}

describe('setupE2EHooks', () => {
  it('exports the expected sentinels', () => {
    expect(TEST_QUERY_PARAM_FLAG).toBe('safertranslate_test=1');
    expect(TEST_TRIGGER_MESSAGE_TYPE).toBe('SAFERTRANSLATE_TEST_TRIGGER');
  });

  describe('URL auto-trigger', () => {
    it('does NOT register a load listener without the query flag', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow({ search: '?foo=bar' });
      setupE2EHooks(w, trigger);
      expect(listeners.load).toBeUndefined();
    });

    it('registers a load listener when the flag is present and doc is still loading', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow({
        search: '?safertranslate_test=1',
        readyState: 'loading',
      });
      setupE2EHooks(w, trigger);
      expect(listeners.load?.length).toBe(1);
      expect(trigger).not.toHaveBeenCalled();
    });

    it('fires trigger when the load event is dispatched', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow({
        search: '?safertranslate_test=1',
        readyState: 'loading',
      });
      setupE2EHooks(w, trigger);
      listeners.load![0]!(new Event('load'));
      expect(trigger).toHaveBeenCalledTimes(1);
    });

    it('schedules a deferred trigger if the document is already complete', async () => {
      const trigger = vi.fn();
      const { w } = mockWindow({
        search: '?safertranslate_test=1',
        readyState: 'complete',
      });
      setupE2EHooks(w, trigger);
      expect(trigger).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 10));
      expect(trigger).toHaveBeenCalledTimes(1);
    });

    it('matches the flag even with extra query params', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow({
        search: '?foo=1&safertranslate_test=1&bar=2',
        readyState: 'loading',
      });
      setupE2EHooks(w, trigger);
      expect(listeners.load?.length).toBe(1);
    });
  });

  describe('postMessage trigger', () => {
    it('registers a message listener regardless of URL flag', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow();
      setupE2EHooks(w, trigger);
      expect(listeners.message?.length).toBe(1);
    });

    it('fires trigger when receiving the expected message from the same window', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow();
      setupE2EHooks(w, trigger);
      listeners.message![0]!({
        source: w,
        data: { type: 'SAFERTRANSLATE_TEST_TRIGGER' },
      } as unknown as MessageEvent);
      expect(trigger).toHaveBeenCalledTimes(1);
    });

    it('ignores messages with a different type', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow();
      setupE2EHooks(w, trigger);
      listeners.message![0]!({
        source: w,
        data: { type: 'SOMETHING_ELSE' },
      } as unknown as MessageEvent);
      expect(trigger).not.toHaveBeenCalled();
    });

    it('ignores messages from cross-frame (event.source !== window)', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow();
      setupE2EHooks(w, trigger);
      const otherWindow = {} as Window;
      listeners.message![0]!({
        source: otherWindow,
        data: { type: 'SAFERTRANSLATE_TEST_TRIGGER' },
      } as unknown as MessageEvent);
      expect(trigger).not.toHaveBeenCalled();
    });

    it('tolerates malformed data without throwing', () => {
      const trigger = vi.fn();
      const { w, listeners } = mockWindow();
      setupE2EHooks(w, trigger);
      for (const data of [null, undefined, 'string', 42, { notType: 'x' }]) {
        listeners.message![0]!({ source: w, data } as unknown as MessageEvent);
      }
      expect(trigger).not.toHaveBeenCalled();
    });
  });
});
