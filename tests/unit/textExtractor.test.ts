/**
 * Text Extractor Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractTranslatableElements,
  markAsTranslated,
  isTranslated,
  clearTranslationMarks,
  TRANSLATED_ATTR,
} from '@/content/textExtractor';

/**
 * Helper to create DOM elements for testing
 */
function createElement(tag: string, text: string, attrs?: Record<string, string>): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = text;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

describe('textExtractor', () => {
  beforeEach(() => {
    // Clear document body before each test
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  describe('extractTranslatableElements', () => {
    it('should extract paragraph elements', () => {
      document.body.appendChild(createElement('p', 'Hello World'));
      document.body.appendChild(createElement('p', 'Another paragraph'));

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(2);
      expect(elements[0]?.text).toBe('Hello World');
      expect(elements[1]?.text).toBe('Another paragraph');
    });

    it('should extract heading elements', () => {
      document.body.appendChild(createElement('h1', 'Main Title'));
      document.body.appendChild(createElement('h2', 'Subtitle'));
      document.body.appendChild(createElement('h3', 'Section'));

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(3);
      expect(elements[0]?.text).toBe('Main Title');
      expect(elements[1]?.text).toBe('Subtitle');
      expect(elements[2]?.text).toBe('Section');
    });

    it('should extract list items', () => {
      const ul = document.createElement('ul');
      ul.appendChild(createElement('li', 'Item One'));
      ul.appendChild(createElement('li', 'Item Two'));
      document.body.appendChild(ul);

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(2);
      expect(elements[0]?.text).toBe('Item One');
      expect(elements[1]?.text).toBe('Item Two');
    });

    it('should skip empty elements', () => {
      document.body.appendChild(createElement('p', 'Has content'));
      document.body.appendChild(createElement('p', ''));
      document.body.appendChild(createElement('p', '   '));

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(1);
      expect(elements[0]?.text).toBe('Has content');
    });

    it('should skip very short text', () => {
      document.body.appendChild(createElement('p', 'OK'));
      document.body.appendChild(createElement('p', 'This is long enough'));

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(1);
      expect(elements[0]?.text).toBe('This is long enough');
    });

    it('should skip already translated elements', () => {
      document.body.appendChild(createElement('p', 'Already translated', { [TRANSLATED_ATTR]: 'true' }));
      document.body.appendChild(createElement('p', 'Not translated yet'));

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(1);
      expect(elements[0]?.text).toBe('Not translated yet');
    });

    it('should skip elements inside code/pre tags', () => {
      document.body.appendChild(createElement('p', 'Normal text'));

      const pre = document.createElement('pre');
      pre.appendChild(createElement('p', 'Code block text'));
      document.body.appendChild(pre);

      const code = document.createElement('code');
      code.appendChild(createElement('p', 'Inline code'));
      document.body.appendChild(code);

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(1);
      expect(elements[0]?.text).toBe('Normal text');
    });

    it('should handle nested elements correctly', () => {
      const div = document.createElement('div');
      div.appendChild(createElement('p', 'Nested paragraph'));
      document.body.appendChild(div);

      const elements = extractTranslatableElements();

      expect(elements).toHaveLength(1);
      expect(elements[0]?.text).toBe('Nested paragraph');
    });
  });

  describe('markAsTranslated', () => {
    it('should add translation attribute to element', () => {
      const element = createElement('p', 'Test');
      document.body.appendChild(element);

      markAsTranslated(element);

      expect(element.hasAttribute(TRANSLATED_ATTR)).toBe(true);
      expect(element.getAttribute(TRANSLATED_ATTR)).toBe('true');
    });
  });

  describe('isTranslated', () => {
    it('should return true for translated elements', () => {
      const element = createElement('p', 'Test', { [TRANSLATED_ATTR]: 'true' });
      document.body.appendChild(element);

      expect(isTranslated(element)).toBe(true);
    });

    it('should return false for non-translated elements', () => {
      const element = createElement('p', 'Test');
      document.body.appendChild(element);

      expect(isTranslated(element)).toBe(false);
    });
  });

  describe('clearTranslationMarks', () => {
    it('should remove all translation marks', () => {
      document.body.appendChild(createElement('p', 'One', { [TRANSLATED_ATTR]: 'true' }));
      document.body.appendChild(createElement('p', 'Two', { [TRANSLATED_ATTR]: 'true' }));
      document.body.appendChild(createElement('p', 'Three'));

      clearTranslationMarks();

      const marked = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
      expect(marked).toHaveLength(0);
    });
  });
});
