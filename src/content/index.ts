/**
 * Content Script - Entry point
 * Injected into web pages to handle translation
 */

import type { ExtensionMessage } from '@/services/types';
import { translate } from '@/services/translator';
import { extractTranslatableElements } from './textExtractor';
import { injectTranslation, removeAllTranslations, hasTranslations } from './domInjector';
import './styles.css';

/**
 * Listen for messages from popup/background
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'TRANSLATE_PAGE') {
      handleTranslatePage()
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('[SaferTranslate] Translation error:', error);
          sendResponse({ success: false, error: String(error) });
        });
      return true; // Keep channel open for async response
    }
    return false;
  }
);

/**
 * Handle page translation request
 */
async function handleTranslatePage(): Promise<void> {
  console.log('[SaferTranslate] Translation requested');

  // Toggle: if translations exist, remove them
  if (hasTranslations()) {
    console.log('[SaferTranslate] Removing existing translations');
    removeAllTranslations();
    return;
  }

  // Extract translatable elements
  const elements = extractTranslatableElements();
  console.log(`[SaferTranslate] Found ${elements.length} elements to translate`);

  if (elements.length === 0) {
    console.log('[SaferTranslate] No translatable elements found');
    return;
  }

  // Translate each element
  // Note: Using sequential translation with small batches to avoid rate limiting
  const BATCH_SIZE = 5;
  let translatedCount = 0;

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
          // Continue with other elements even if one fails
        }
      })
    );

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < elements.length) {
      await delay(200);
    }
  }

  console.log(`[SaferTranslate] Translated ${translatedCount} elements`);
}

/**
 * Utility function for delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log('[SaferTranslate] Content script loaded');
