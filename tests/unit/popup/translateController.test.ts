/**
 * Tests for src/popup/translateController.ts
 *
 * Pure state machine tests. DOM-free. All timers are controlled via the
 * injected `setTimer` / `clearTimer` deps so tests can drive them
 * deterministically without vi.useFakeTimers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ControllerDeps, ControllerState } from '@/popup/translateController';
import { createTranslateController, REACHING_TIMEOUT_MS, HEARTBEAT_TIMEOUT_MS } from '@/popup/translateController';

type PendingTimer = { id: number; ms: number; cb: () => void };

function makeDeps(): {
  deps: ControllerDeps;
  states: ControllerState[];
  resolveSend: (value: unknown) => void;
  rejectSend: (err: unknown) => void;
  fireTimer: (id: number) => void;
  pending: Map<number, PendingTimer>;
  now: { value: number };
} {
  const states: ControllerState[] = [];
  const pending = new Map<number, PendingTimer>();
  let nextTimerId = 1;
  const now = { value: 1000 };

  let resolveSend: (value: unknown) => void = () => {};
  let rejectSend: (err: unknown) => void = () => {};
  const sendMessage = vi.fn(() => new Promise<unknown>((resolve, reject) => {
    resolveSend = resolve;
    rejectSend = reject;
  }));

  const deps: ControllerDeps = {
    onStateChange: (state) => states.push(state),
    sendMessage,
    setTimer: (ms, cb) => {
      const id = nextTimerId++;
      pending.set(id, { id, ms, cb });
      return id;
    },
    clearTimer: (id) => {
      pending.delete(id);
    },
    now: () => now.value,
  };

  return {
    deps,
    states,
    resolveSend: (v) => resolveSend(v),
    rejectSend: (e) => rejectSend(e),
    fireTimer: (id) => {
      const timer = pending.get(id);
      if (!timer) throw new Error(`timer ${id} does not exist`);
      pending.delete(id);
      timer.cb();
    },
    pending,
    now,
  };
}

describe('translateController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions to reaching and calls sendMessage on start()', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();

    expect(ctx.states.map((s) => s.phase)).toEqual(['reaching']);
    expect(ctx.deps.sendMessage).toHaveBeenCalledWith({ type: 'TRANSLATE_PAGE' });
    expect(ctx.pending.size).toBe(1);

    // Resolve the send to let start() settle
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 10 });
    await startPromise;
  });

  it('transitions to working when TRANSLATION_STARTED ack is received', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 42 });
    await startPromise;

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('working');
    if (last?.phase === 'working') {
      expect(last.done).toBe(0);
      expect(last.total).toBe(42);
    }
    // Reaching timer was cleared, working heartbeat timer is armed
    expect(ctx.pending.size).toBe(1);
  });

  it('transitions to error with "unreachable" when reaching timer fires', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    controller.start();

    // Find the reaching timer and fire it
    const timers = [...ctx.pending.values()];
    expect(timers[0]?.ms).toBe(REACHING_TIMEOUT_MS);
    ctx.fireTimer(timers[0]!.id);

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('error');
    if (last?.phase === 'error') {
      expect(last.message).toMatch(/Content scriptに到達できません/);
    }
  });

  it('transitions to error when sendMessage rejects', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.rejectSend(new Error('no receiver'));
    await startPromise;

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('error');
    if (last?.phase === 'error') {
      expect(last.message).toMatch(/no receiver/);
    }
  });

  it('updates done on TRANSLATION_PROGRESS and resets heartbeat timer', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 100 });
    await startPromise;

    // Grab the current heartbeat timer id
    const firstHeartbeat = [...ctx.pending.values()][0]!;
    expect(firstHeartbeat.ms).toBe(HEARTBEAT_TIMEOUT_MS);

    controller.handleMessage({ type: 'TRANSLATION_PROGRESS', done: 10, total: 100, phase: 'translate' });

    // The old heartbeat should be cleared, a new one armed
    expect(ctx.pending.has(firstHeartbeat.id)).toBe(false);
    expect(ctx.pending.size).toBe(1);

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('working');
    if (last?.phase === 'working') {
      expect(last.done).toBe(10);
      expect(last.total).toBe(100);
    }
  });

  it('multiple PROGRESS messages keep extending the heartbeat', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 100 });
    await startPromise;

    for (const done of [10, 20, 30]) {
      controller.handleMessage({ type: 'TRANSLATION_PROGRESS', done, total: 100, phase: 'translate' });
      expect(ctx.pending.size).toBe(1);
    }

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('working');
    if (last?.phase === 'working') {
      expect(last.done).toBe(30);
    }
  });

  it('transitions to done on TRANSLATION_COMPLETE', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 5 });
    await startPromise;

    ctx.now.value += 7000;
    controller.handleMessage({ type: 'TRANSLATION_COMPLETE', translatedCount: 5, elapsedMs: 7000 });

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('done');
    if (last?.phase === 'done') {
      expect(last.translatedCount).toBe(5);
      expect(last.elapsedMs).toBe(7000);
    }
    // Heartbeat timer cleared
    expect(ctx.pending.size).toBe(0);
  });

  it('transitions to error on TRANSLATION_FAILED', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 5 });
    await startPromise;

    controller.handleMessage({ type: 'TRANSLATION_FAILED', error: 'API rate limit', phase: 'translate' });

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('error');
    if (last?.phase === 'error') {
      expect(last.message).toMatch(/translate/);
      expect(last.message).toMatch(/API rate limit/);
    }
    expect(ctx.pending.size).toBe(0);
  });

  it('transitions to error with "stalled" when heartbeat fires', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 100 });
    await startPromise;

    const heartbeat = [...ctx.pending.values()][0]!;
    ctx.fireTimer(heartbeat.id);

    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('error');
    if (last?.phase === 'error') {
      expect(last.message).toMatch(/翻訳停滞/);
    }
  });

  it('ignores PROGRESS messages arriving before ack (idle/reaching state)', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    controller.start(); // in reaching state
    controller.handleMessage({ type: 'TRANSLATION_PROGRESS', done: 5, total: 10, phase: 'translate' });

    // Still in reaching — progress ignored because no working state to update
    const last = ctx.states[ctx.states.length - 1];
    expect(last?.phase).toBe('reaching');
  });

  it('ignores messages after terminal state (done)', async () => {
    const ctx = makeDeps();
    const controller = createTranslateController(ctx.deps);

    const startPromise = controller.start();
    ctx.resolveSend({ type: 'TRANSLATION_STARTED', total: 1 });
    await startPromise;
    controller.handleMessage({ type: 'TRANSLATION_COMPLETE', translatedCount: 1, elapsedMs: 100 });

    const stateCountBefore = ctx.states.length;
    controller.handleMessage({ type: 'TRANSLATION_PROGRESS', done: 2, total: 10, phase: 'translate' });
    controller.handleMessage({ type: 'TRANSLATION_COMPLETE', translatedCount: 10, elapsedMs: 999 });

    // No new state emissions after terminal state
    expect(ctx.states.length).toBe(stateCountBefore);
  });
});
