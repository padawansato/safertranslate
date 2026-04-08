/**
 * Cross-browser content script injection module.
 * Ensures a content script is running in the target tab, injecting it if needed.
 */

import { tabs, scripting, isSafari } from '@/lib/browser';

const SAFARI_PERMISSION_ERROR =
  'Safariの拡張機能の権限が必要です。Safari設定 → 拡張機能 → SaferTranslate → このサイトで「常に許可」を選択してください。';

const GENERIC_RELOAD_ERROR =
  'Content scriptから応答がありません。ページをリロードしてお試しください。';

const SAFARI_INIT_DELAY_MS = 100;

type InjectorResult = { success: boolean; error?: string; needsPermission?: boolean };

/**
 * Tries to send a message to the content script in the given tab.
 * If the content script is not yet injected, it injects it first, then retries.
 */
export async function ensureContentScriptAndSendMessage(
  tabId: number,
  message: { type: string },
): Promise<InjectorResult> {
  // Step 1: Try sending the message directly.
  try {
    const response = await tabs.sendMessage(tabId, message);
    if (response != null) {
      return response as InjectorResult;
    }
  } catch {
    // Content script not yet injected — fall through to injection.
  }

  // Step 2: Inject content script programmatically.
  try {
    await scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
  } catch {
    // Injection failed.
    if (isSafari()) {
      return {
        success: false,
        needsPermission: true,
        error: SAFARI_PERMISSION_ERROR,
      };
    }
    return {
      success: false,
      error: GENERIC_RELOAD_ERROR,
    };
  }

  // Step 3: Inject CSS (errors are swallowed).
  await scripting.insertCSS({
    target: { tabId },
    files: ['content.css'],
  }).catch(() => { /* CSS may already be loaded or not required */ });

  // Step 4: On Safari, wait for the content script to initialize.
  if (isSafari()) {
    await new Promise<void>((resolve) => setTimeout(resolve, SAFARI_INIT_DELAY_MS));
  }

  // Step 5: Retry sending the message.
  try {
    const response = await tabs.sendMessage(tabId, message);
    if (response != null) {
      return response as InjectorResult;
    }
    return { success: false, error: GENERIC_RELOAD_ERROR };
  } catch {
    return { success: false, error: GENERIC_RELOAD_ERROR };
  }
}
