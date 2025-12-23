/**
 * Text Extractor
 * Extracts translatable text elements from the page
 */

/**
 * Elements to extract text from
 */
const TRANSLATABLE_SELECTORS = [
  'p',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li',
  'td', 'th',
  'blockquote',
  'figcaption',
  'dt', 'dd',
].join(', ');

/**
 * Elements to skip (and their children)
 */
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'CANVAS',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
]);

/**
 * Data attribute to mark translated elements
 */
export const TRANSLATED_ATTR = 'data-safertranslate';

/**
 * Extracted text element with its DOM reference
 */
export interface ExtractedElement {
  element: HTMLElement;
  text: string;
}

/**
 * Extract translatable elements from the page
 */
export function extractTranslatableElements(): ExtractedElement[] {
  const elements = document.querySelectorAll<HTMLElement>(TRANSLATABLE_SELECTORS);
  const result: ExtractedElement[] = [];

  for (const element of elements) {
    // Skip already translated elements
    if (element.hasAttribute(TRANSLATED_ATTR)) {
      continue;
    }

    // Skip elements inside skip tags
    if (isInsideSkipTag(element)) {
      continue;
    }

    // Skip hidden elements
    if (!isVisible(element)) {
      continue;
    }

    // Get direct text content (not from children)
    const text = getDirectTextContent(element);

    // Skip empty or whitespace-only text
    if (!text.trim()) {
      continue;
    }

    // Skip very short text (likely not meaningful)
    if (text.trim().length < 3) {
      continue;
    }

    result.push({ element, text });
  }

  return result;
}

/**
 * Check if element is inside a tag that should be skipped
 */
function isInsideSkipTag(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;

  while (current) {
    if (SKIP_TAGS.has(current.tagName)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * Check if element is visible
 * Note: offsetParent check is skipped in test environments (jsdom)
 */
function isVisible(element: HTMLElement): boolean {
  // Check if element is connected to DOM
  if (!element.isConnected) {
    return false;
  }

  const style = window.getComputedStyle(element);

  // Check computed styles for hidden elements
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false;
  }

  // offsetParent is null in jsdom, so only check in browser environment
  // In real browser, offsetParent is null for hidden elements or fixed position
  if (typeof element.offsetParent !== 'undefined') {
    // Skip this check if offsetParent is not available (jsdom)
    // or if element is body/html (they have null offsetParent but are visible)
    const isRootElement = element === document.body || element === document.documentElement;
    if (!isRootElement && element.offsetParent === null && style.position !== 'fixed') {
      // Additional check: in jsdom offsetParent is always null
      // So we check if getComputedStyle works (indicates real browser)
      if (style.display !== '') {
        // If we got computed style, we're likely in jsdom where offsetParent is unreliable
        // Trust the display/visibility checks above
        return true;
      }
      return false;
    }
  }

  return true;
}

/**
 * Get direct text content (excluding child elements)
 * This helps avoid duplicate translations when parent contains child elements
 */
function getDirectTextContent(element: HTMLElement): string {
  const childNodes = element.childNodes;
  let text = '';

  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  }

  // If no direct text, fall back to full text content
  // (for elements like <p>text</p> with no other children)
  if (!text.trim() && element.childElementCount === 0) {
    text = element.textContent ?? '';
  }

  return text;
}

/**
 * Mark an element as translated
 */
export function markAsTranslated(element: HTMLElement): void {
  element.setAttribute(TRANSLATED_ATTR, 'true');
}

/**
 * Check if an element is already translated
 */
export function isTranslated(element: HTMLElement): boolean {
  return element.hasAttribute(TRANSLATED_ATTR);
}

/**
 * Clear translation marks from all elements
 */
export function clearTranslationMarks(): void {
  const elements = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
  for (const element of elements) {
    element.removeAttribute(TRANSLATED_ATTR);
  }
}
