/**
 * DOM Injector Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  injectTranslation,
  injectTranslations,
  removeAllTranslations,
  hasTranslations,
  getTranslationCount,
} from '@/content/domInjector';
import { TRANSLATED_ATTR } from '@/content/textExtractor';

/**
 * Helper to create DOM elements for testing
 */
function createElement(tag: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

/**
 * Helper to clear document body
 */
function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

describe('domInjector', () => {
  beforeEach(() => {
    clearBody();
  });

  afterEach(() => {
    clearBody();
  });

  describe('injectTranslation', () => {
    it('should insert translation box after element', () => {
      const element = createElement('p', 'Original text');
      document.body.appendChild(element);

      injectTranslation(element, 'Translated text');

      const box = document.querySelector('.safertranslate-box');
      expect(box).not.toBeNull();
      expect(box?.textContent).toBe('Translated text');
    });

    it('should mark original element as translated', () => {
      const element = createElement('p', 'Original text');
      document.body.appendChild(element);

      injectTranslation(element, 'Translated text');

      expect(element.hasAttribute(TRANSLATED_ATTR)).toBe(true);
    });

    it('should set lang attribute to ja', () => {
      const element = createElement('p', 'Original text');
      document.body.appendChild(element);

      injectTranslation(element, 'こんにちは');

      const box = document.querySelector('.safertranslate-box');
      expect(box?.getAttribute('lang')).toBe('ja');
    });

    it('should insert box immediately after the element', () => {
      const firstP = createElement('p', 'First');
      const secondP = createElement('p', 'Second');
      document.body.appendChild(firstP);
      document.body.appendChild(secondP);

      injectTranslation(firstP, 'Translation');

      const children = document.body.children;
      expect(children[0]?.tagName).toBe('P');
      expect(children[1]?.classList.contains('safertranslate-box')).toBe(true);
      expect(children[2]?.tagName).toBe('P');
    });

    it('should return the created translation box', () => {
      const element = createElement('p', 'Original text');
      document.body.appendChild(element);

      const box = injectTranslation(element, 'Translated text');

      expect(box).toBeInstanceOf(HTMLElement);
      expect(box.textContent).toBe('Translated text');
    });
  });

  describe('injectTranslations', () => {
    it('should inject multiple translations', () => {
      const p1 = createElement('p', 'One');
      const p2 = createElement('p', 'Two');
      document.body.appendChild(p1);
      document.body.appendChild(p2);

      const pairs = [
        { element: p1, translatedText: '一' },
        { element: p2, translatedText: '二' },
      ];

      const boxes = injectTranslations(pairs);

      expect(boxes).toHaveLength(2);
      expect(getTranslationCount()).toBe(2);
    });
  });

  describe('removeAllTranslations', () => {
    it('should remove all translation boxes', () => {
      const p1 = createElement('p', 'One');
      const p2 = createElement('p', 'Two');
      document.body.appendChild(p1);
      document.body.appendChild(p2);

      injectTranslation(p1, '一');
      injectTranslation(p2, '二');

      expect(getTranslationCount()).toBe(2);

      removeAllTranslations();

      expect(getTranslationCount()).toBe(0);
    });

    it('should clear translation marks from elements', () => {
      const element = createElement('p', 'Test');
      document.body.appendChild(element);

      injectTranslation(element, 'テスト');
      expect(element.hasAttribute(TRANSLATED_ATTR)).toBe(true);

      removeAllTranslations();
      expect(element.hasAttribute(TRANSLATED_ATTR)).toBe(false);
    });
  });

  describe('hasTranslations', () => {
    it('should return false when no translations exist', () => {
      document.body.appendChild(createElement('p', 'No translations'));

      expect(hasTranslations()).toBe(false);
    });

    it('should return true when translations exist', () => {
      const element = createElement('p', 'Text');
      document.body.appendChild(element);

      injectTranslation(element, 'テキスト');

      expect(hasTranslations()).toBe(true);
    });
  });

  describe('getTranslationCount', () => {
    it('should return 0 when no translations', () => {
      document.body.appendChild(createElement('p', 'No translations'));

      expect(getTranslationCount()).toBe(0);
    });

    it('should return correct count', () => {
      const p1 = createElement('p', 'One');
      const p2 = createElement('p', 'Two');
      const p3 = createElement('p', 'Three');
      document.body.appendChild(p1);
      document.body.appendChild(p2);
      document.body.appendChild(p3);

      injectTranslation(p1, '一');
      injectTranslation(p2, '二');

      expect(getTranslationCount()).toBe(2);
    });
  });
});
