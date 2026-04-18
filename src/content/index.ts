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
import { runOnceInContentScript } from '@/lib/singletonContentScript';
import { setupE2EHooks } from './e2e-hooks';
import './styles.css';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

type SendResponseFn = (response: ExtensionMessage) => void;

/**
 * Core TRANSLATE_PAGE handler, shared by the runtime message listener and
 * the E2E hooks. The second-click "remove translations" behavior and the
 * immediate TRANSLATION_STARTED ack both live here so hooks get identical
 * semantics to a popup click.
 */
function handleTranslatePage(sendResponse: SendResponseFn): void {
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
      return;
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
}

/**
 * Listen for messages from popup/background.
 *
 * For TRANSLATE_PAGE, we respond IMMEDIATELY (via sendResponse) with a
 * TRANSLATION_STARTED ack that includes the element count. The actual
 * translation runs asynchronously afterwards and emits progress via
 * runtime.sendMessage so the popup can track per-batch progress.
 *
 * The singleton guard (#8, rules/safari-messaging.md) ensures this
 * listener is registered only once per isolated-world window even when
 * the content script is injected twice (manifest + executeScript fallback).
 */
runOnceInContentScript('__safertranslate_listener_v1', () => {
  runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type !== 'TRANSLATE_PAGE') return false;

      handleTranslatePage(sendResponse);

      // return true — see rules/safari-messaging.md. Safari 17 drops
      // sync sendResponse when a listener returns false.
      return true;
    },
  );

  // E2E hooks: URL query flag + window.postMessage. sendResponse is a no-op
  // since there's no message-channel caller in these cases; progress still
  // flows through runtime.sendMessage as normal.
  setupE2EHooks(window, () => handleTranslatePage(() => { /* no-op */ }));
});

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
