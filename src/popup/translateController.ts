/**
 * Translate state machine for the popup.
 *
 * Phases:
 *   idle → reaching → working → done
 *                          ↓
 *                        error
 *
 * Each phase has its own timeout so the popup can tell *where* a translation
 * failed instead of showing a single generic "timeout" error.
 *
 *   reaching:  content script must ack within REACHING_TIMEOUT_MS
 *   working:   heartbeat — each PROGRESS message resets HEARTBEAT_TIMEOUT_MS
 *
 * The controller is DOM-free; a caller wires it to the popup UI via the
 * onStateChange callback. Timers are abstracted through setTimer/clearTimer
 * so tests can drive them deterministically.
 */

import type {
  TranslationStartedMessage,
  TranslationStartFailedMessage,
  TranslationProgressMessage,
  TranslationCompleteMessage,
  TranslationFailedMessage,
} from '@/services/types';

/** Reaching: how long to wait for the content script's sendResponse ack. */
export const REACHING_TIMEOUT_MS = 3_000;

/**
 * Working: max time without a PROGRESS message before declaring a stall.
 * Generous enough to cover model load (~30s) plus the first batch (~15s).
 */
export const HEARTBEAT_TIMEOUT_MS = 60_000;

export type ControllerState =
  | { phase: 'idle' }
  | { phase: 'reaching'; startedAt: number }
  | { phase: 'working'; done: number; total: number; startedAt: number }
  | { phase: 'done'; translatedCount: number; elapsedMs: number }
  | { phase: 'error'; message: string };

export type TimerHandle = number;

export interface ControllerDeps {
  onStateChange: (state: ControllerState) => void;
  sendMessage: (msg: { type: 'TRANSLATE_PAGE' }) => Promise<unknown>;
  setTimer: (ms: number, cb: () => void) => TimerHandle;
  clearTimer: (handle: TimerHandle) => void;
  now: () => number;
}

type IncomingMessage =
  | TranslationStartedMessage
  | TranslationStartFailedMessage
  | TranslationProgressMessage
  | TranslationCompleteMessage
  | TranslationFailedMessage
  | { type: string; [k: string]: unknown };

export interface TranslateController {
  start(): Promise<void>;
  handleMessage(msg: unknown): void;
}

export function createTranslateController(deps: ControllerDeps): TranslateController {
  let state: ControllerState = { phase: 'idle' };
  let activeTimer: TimerHandle | undefined;

  // Indirection so TypeScript's flow analysis cannot narrow state.phase
  // across a function call — state is mutated via closure side-effects
  // inside transition(), which TS cannot see.
  const getPhase = (): ControllerState['phase'] => state.phase;

  const transition = (next: ControllerState): void => {
    state = next;
    deps.onStateChange(next);
  };

  const clearActiveTimer = (): void => {
    if (activeTimer !== undefined) {
      deps.clearTimer(activeTimer);
      activeTimer = undefined;
    }
  };

  const armHeartbeat = (): void => {
    clearActiveTimer();
    activeTimer = deps.setTimer(HEARTBEAT_TIMEOUT_MS, () => {
      if (getPhase() !== 'working') return;
      clearActiveTimer();
      transition({
        phase: 'error',
        message: `翻訳停滞 (${HEARTBEAT_TIMEOUT_MS / 1000}秒進捗なし)`,
      });
    });
  };

  const moveToError = (message: string): void => {
    clearActiveTimer();
    transition({ phase: 'error', message });
  };

  return {
    async start(): Promise<void> {
      if (getPhase() !== 'idle') return;

      transition({ phase: 'reaching', startedAt: deps.now() });

      activeTimer = deps.setTimer(REACHING_TIMEOUT_MS, () => {
        if (getPhase() !== 'reaching') return;
        moveToError('Content scriptに到達できません (ページをリロードしてください)');
      });

      try {
        const response = await deps.sendMessage({ type: 'TRANSLATE_PAGE' });
        // Terminal state (error/done) may have been reached via timer race.
        if (getPhase() !== 'reaching') return;

        const ack = response as IncomingMessage | undefined;
        if (!ack || typeof ack !== 'object' || !('type' in ack)) {
          moveToError('Content script から不正な応答');
          return;
        }

        if (ack.type === 'TRANSLATION_STARTED') {
          const total = typeof ack.total === 'number' ? ack.total : 0;
          clearActiveTimer();
          transition({
            phase: 'working',
            done: 0,
            total,
            startedAt: deps.now(),
          });
          armHeartbeat();
          return;
        }

        if (ack.type === 'TRANSLATION_START_FAILED') {
          const err = typeof ack.error === 'string' ? ack.error : '開始失敗';
          moveToError(err);
          return;
        }

        moveToError(`予期しない応答: ${String(ack.type)}`);
      } catch (error) {
        if (getPhase() !== 'reaching') return;
        const message = error instanceof Error ? error.message : String(error);
        moveToError(message);
      }
    },

    handleMessage(msg: unknown): void {
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;
      const m = msg as IncomingMessage;

      // Ignore messages that arrive while not in working state.
      if (getPhase() !== 'working') return;
      // Narrow for the rest of the function via a local snapshot.
      const workingState = state as Extract<ControllerState, { phase: 'working' }>;

      if (m.type === 'TRANSLATION_PROGRESS') {
        const done = typeof m.done === 'number' ? m.done : workingState.done;
        const total = typeof m.total === 'number' ? m.total : workingState.total;
        transition({ phase: 'working', done, total, startedAt: workingState.startedAt });
        armHeartbeat();
        return;
      }

      if (m.type === 'TRANSLATION_COMPLETE') {
        clearActiveTimer();
        const translatedCount = typeof m.translatedCount === 'number' ? m.translatedCount : 0;
        const elapsedMs = typeof m.elapsedMs === 'number' ? m.elapsedMs : deps.now() - workingState.startedAt;
        transition({ phase: 'done', translatedCount, elapsedMs });
        return;
      }

      if (m.type === 'TRANSLATION_FAILED') {
        const err = typeof m.error === 'string' ? m.error : '不明なエラー';
        const phase = typeof m.phase === 'string' ? m.phase : 'translate';
        moveToError(`${phase}: ${err}`);
        return;
      }
    },
  };
}
