/**
 * Cross-browser content script injection module.
 *
 * Ensures a content script is running in the target tab, injecting it if
 * needed, then forwards the message. Returns the raw content script
 * response on success, or throws InjectorError with a user-facing message
 * on injection/messaging failure.
 */

import { tabs, scripting, isSafari } from '@/lib/browser';

const SAFARI_PERMISSION_ERROR =
  'Safariの拡張機能の権限が必要です。Safari設定 → 拡張機能 → SaferTranslate → このサイトで「常に許可」を選択してください。';

const GENERIC_RELOAD_ERROR =
  'Content scriptから応答がありません。ページをリロードしてお試しください。';

const SAFARI_INIT_DELAY_MS = 100;

export class InjectorError extends Error {
  readonly needsPermission: boolean;
  constructor(message: string, needsPermission = false) {
    super(message);
    this.name = 'InjectorError';
    this.needsPermission = needsPermission;
  }
}

export async function ensureContentScriptAndSendMessage(
  tabId: number,
  message: { type: string },
): Promise<unknown> {
  // Step 1: Try sending the message directly (content script may already be loaded).
  try {
    const response = await tabs.sendMessage(tabId, message);
    if (response != null) return response;
  } catch {
    // Fall through to injection.
  }

  // Step 2: Inject content script programmatically.
  try {
    await scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
  } catch {
    if (isSafari()) {
      throw new InjectorError(SAFARI_PERMISSION_ERROR, true);
    }
    throw new InjectorError(GENERIC_RELOAD_ERROR, false);
  }

  // Step 3: Inject CSS (errors are swallowed — it may already be present).
  await scripting.insertCSS({
    target: { tabId },
    files: ['content.css'],
  }).catch(() => { /* ignore */ });

  // Step 4: On Safari, wait briefly for the content script to initialize.
  if (isSafari()) {
    await new Promise<void>((resolve) => setTimeout(resolve, SAFARI_INIT_DELAY_MS));
  }

  // Step 5: Retry sending the message.
  try {
    const response = await tabs.sendMessage(tabId, message);
    if (response != null) return response;
    throw new InjectorError(GENERIC_RELOAD_ERROR, false);
  } catch (error) {
    if (error instanceof InjectorError) throw error;
    throw new InjectorError(GENERIC_RELOAD_ERROR, false);
  }
}
