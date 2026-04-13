/**
 * Content Script - Entry point
 * Injected into web pages to handle translation
 */

import type {
  ExtensionMessage,
  TranslationStartedMessage,
  TranslationStartFailedMessage,
  TranslationProgressMessage,
  TranslationCompleteMessage,
  TranslationFailedMessage,
} from '@/services/types';
import { translate } from '@/services/translator';
import { extractTranslatableElements } from './textExtractor';
import { injectTranslation, removeAllTranslations, hasTranslations } from './domInjector';
import { runtime } from '@/lib/browser';
import './styles.css';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

/**
 * Listen for messages from popup/background.
 *
 * For TRANSLATE_PAGE, we respond IMMEDIATELY (via sendResponse) with a
 * TRANSLATION_STARTED ack that includes the element count. The actual
 * translation runs asynchronously afterwards and emits progress via
 * runtime.sendMessage so the popup can track per-batch progress.
 *
 * Guard against duplicate module execution: if this content script runs
 * twice on the same page (e.g., once via manifest `content_scripts` and
 * once via `scripting.executeScript` fallback in `contentScriptInjector`),
 * both instances would register listeners and each TRANSLATE_PAGE would
 * trigger two parallel `runTranslation` calls, double-injecting every box.
 * The window-level flag ensures only the first instance binds.
 */
const WINDOW_GUARD = '__safertranslate_listener_v1' as const;
type GuardedWindow = Window & { [WINDOW_GUARD]?: boolean };
const guardedWindow = window as GuardedWindow;

if (!guardedWindow[WINDOW_GUARD]) {
  guardedWindow[WINDOW_GUARD] = true;

  runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type !== 'TRANSLATE_PAGE') return false;

      try {
        if (hasTranslations()) {
          console.log('[SaferTranslate] Removing existing translations');
          removeAllTranslations();
          const ack: TranslationStartedMessage = { type: 'TRANSLATION_STARTED', total: 0 };
          sendResponse(ack);
          const complete: TranslationCompleteMessage = {
            type: 'TRANSLATION_COMPLETE',
            translatedCount: 0,
            elapsedMs: 0,
          };
          void runtime.sendMessage(complete);
          return true;
        }

        const elements = extractTranslatableElements();
        console.log(`[SaferTranslate] Found ${elements.length} elements to translate`);

        const ack: TranslationStartedMessage = {
          type: 'TRANSLATION_STARTED',
          total: elements.length,
        };
        sendResponse(ack);

        void runTranslation(elements);
      } catch (error) {
        const startFailed: TranslationStartFailedMessage = {
          type: 'TRANSLATION_START_FAILED',
          error: String(error),
        };
        sendResponse(startFailed);
      }

      // Return true keeps the channel alive long enough for Safari to
      // reliably deliver the sync sendResponse above. Returning false
      // with a sync response was observed to drop the ack on Safari 17,
      // causing contentScriptInjector's Step-1 sendMessage to resolve
      // with undefined and fall through to executeScript, which then
      // injected this content script a second time.
      return true;
    },
  );
}

/**
 * Run the translation loop and emit progress/complete/failed events.
 * Any per-element errors are swallowed and the loop continues; only a
 * fatal error (e.g., the entire pipeline rejecting) triggers FAILED.
 */
async function runTranslation(elements: { element: HTMLElement; text: string }[]): Promise<void> {
  const startedAt = Date.now();
  let done = 0;
  let translatedCount = 0;
  const total = elements.length;

  // Immediately emit a zero-progress tick so the popup knows work has begun
  // even before the first batch completes (e.g. during model download).
  emitProgress(0, total, 'translate');

  try {
    for (let i = 0; i < elements.length; i += BATCH_SIZE) {
      const batch = elements.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ element, text }) => {
          try {
            const result = await translate(text);
            if (result.translatedText && result.translatedText !== text) {
              injectTranslation(element, result.translatedText);
              translatedCount++;
            }
          } catch (error) {
            console.warn('[SaferTranslate] Failed to translate element:', error);
          }
        }),
      );
      done += batch.length;
      emitProgress(done, total, 'translate');

      if (i + BATCH_SIZE < elements.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const complete: TranslationCompleteMessage = {
      type: 'TRANSLATION_COMPLETE',
      translatedCount,
      elapsedMs: Date.now() - startedAt,
    };
    void runtime.sendMessage(complete);
    console.log(`[SaferTranslate] Translated ${translatedCount} / ${total} elements`);
  } catch (error) {
    const failed: TranslationFailedMessage = {
      type: 'TRANSLATION_FAILED',
      error: error instanceof Error ? error.message : String(error),
      phase: 'translate',
    };
    void runtime.sendMessage(failed);
  }
}

function emitProgress(done: number, total: number, phase: 'model' | 'translate'): void {
  const progress: TranslationProgressMessage = {
    type: 'TRANSLATION_PROGRESS',
    done,
    total,
    phase,
  };
  void runtime.sendMessage(progress);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log('[SaferTranslate] Content script loaded');
