/**
 * DOM Injector
 * Injects translation boxes into the page
 */

import { markAsTranslated, TRANSLATED_ATTR } from './textExtractor';

/**
 * CSS class for translation boxes
 */
const TRANSLATION_BOX_CLASS = 'safertranslate-box';

/**
 * Inject a translation box after an element
 */
export function injectTranslation(
  element: HTMLElement,
  translatedText: string
): HTMLElement {
  // Create translation box
  const box = document.createElement('div');
  box.className = TRANSLATION_BOX_CLASS;
  box.textContent = translatedText;
  box.setAttribute('lang', 'ja');

  // Insert after the original element
  element.insertAdjacentElement('afterend', box);

  // Mark original element as translated
  markAsTranslated(element);

  return box;
}

/**
 * Inject multiple translations
 */
export function injectTranslations(
  pairs: Array<{ element: HTMLElement; translatedText: string }>
): HTMLElement[] {
  const boxes: HTMLElement[] = [];

  for (const { element, translatedText } of pairs) {
    const box = injectTranslation(element, translatedText);
    boxes.push(box);
  }

  return boxes;
}

/**
 * Remove all translation boxes from the page
 */
export function removeAllTranslations(): void {
  // Remove translation boxes
  const boxes = document.querySelectorAll(`.${TRANSLATION_BOX_CLASS}`);
  for (const box of boxes) {
    box.remove();
  }

  // Clear translation marks
  const marked = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
  for (const element of marked) {
    element.removeAttribute(TRANSLATED_ATTR);
  }
}

/**
 * Check if translations exist on the page
 */
export function hasTranslations(): boolean {
  return document.querySelector(`.${TRANSLATION_BOX_CLASS}`) !== null;
}

/**
 * Get count of translation boxes on the page
 */
export function getTranslationCount(): number {
  return document.querySelectorAll(`.${TRANSLATION_BOX_CLASS}`).length;
}
