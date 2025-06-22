/**
 * SourceText Value Object Tests
 * Comprehensive test suite for SourceText domain value object
 */

import { SourceText, TextType } from '@domain/value-objects/SourceText';

describe('SourceText Value Object', () => {
  describe('Construction and Validation', () => {
    it('should create SourceText from plain text', () => {
      const text = SourceText.create('Hello, world!');
      
      expect(text.content).toBe('Hello, world!');
      expect(text.type).toBe('plain');
      expect(text.length).toBe(13);
      expect(text.wordCount).toBe(2);
      expect(text.preserveFormatting).toBe(false);
    });

    it('should create SourceText with explicit type', () => {
      const htmlText = SourceText.create('<p>Hello</p>', { type: 'html' });
      
      expect(htmlText.type).toBe('html');
      expect(htmlText.containsHtml()).toBe(true);
    });

    it('should normalize content during construction', () => {
      const text = SourceText.create('  Hello\r\n\r\nWorld  \n\n\n\nEnd  ');
      
      expect(text.content).toBe('Hello\n\nWorld\n\nEnd');
    });

    it('should throw error for non-string content', () => {
      expect(() => {
        SourceText.create(123 as any);
      }).toThrow('Content must be a string');
    });

    it('should throw error for content exceeding maximum length', () => {
      const longText = 'a'.repeat(50001);
      
      expect(() => {
        SourceText.create(longText);
      }).toThrow('Text exceeds maximum length of 50000 characters');
    });
  });

  describe('Factory Methods', () => {
    it('should create from HTML with formatting preserved', () => {
      const htmlContent = '<p>Hello <strong>world</strong>!</p>';
      const text = SourceText.fromHtml(htmlContent);
      
      expect(text.type).toBe('html');
      expect(text.preserveFormatting).toBe(true);
      expect(text.containsHtml()).toBe(true);
      expect(text.extractionContext).toBe('html-extraction');
    });

    it('should create from HTML element', () => {
      // Mock DOM element
      const mockElement = {
        tagName: 'DIV',
        innerHTML: '<span>Hello</span>',
        textContent: 'Hello'
      } as Element;

      const text = SourceText.fromElement(mockElement);
      
      expect(text.content).toBe('<span>Hello</span>');
      expect(text.type).toBe('html');
      expect(text.extractionContext).toBe('div-element');
    });

    it('should create from plain text', () => {
      const text = SourceText.fromPlainText('Simple text');
      
      expect(text.type).toBe('plain');
      expect(text.preserveFormatting).toBe(false);
    });
  });

  describe('Type Detection', () => {
    it('should detect HTML content', () => {
      const htmlText = SourceText.create('<div>Content</div>');
      expect(htmlText.type).toBe('html');
    });

    it('should detect code content', () => {
      const codeText = SourceText.create('function hello() { return "world"; }');
      expect(codeText.type).toBe('code');
    });

    it('should detect markdown content', () => {
      const markdownText = SourceText.create('## Heading\n\n```code```');
      expect(markdownText.type).toBe('markdown');
    });

    it('should detect JSON content', () => {
      const jsonText = SourceText.create('{"key": "value"}');
      expect(jsonText.type).toBe('json');
    });

    it('should detect XML content', () => {
      const xmlText = SourceText.create('<?xml version="1.0"?><root></root>');
      expect(xmlText.type).toBe('xml');
    });

    it('should default to plain text', () => {
      const plainText = SourceText.create('Just regular text');
      expect(plainText.type).toBe('plain');
    });
  });

  describe('Content Analysis', () => {
    it('should detect code patterns', () => {
      const codeText = SourceText.create('const x = 42; function test() {}');
      expect(codeText.containsCode()).toBe(true);
    });

    it('should detect HTML patterns', () => {
      const htmlText = SourceText.create('Hello <b>world</b>!');
      expect(htmlText.containsHtml()).toBe(true);
    });

    it('should detect numbers', () => {
      const numberText = SourceText.create('The price is $29.99');
      expect(numberText.containsNumbers()).toBe(true);
    });

    it('should identify only numbers', () => {
      const onlyNumbers = SourceText.create('123 456.789');
      expect(onlyNumbers.isOnlyNumbers()).toBe(true);
      
      const withText = SourceText.create('Price: 123');
      expect(withText.isOnlyNumbers()).toBe(false);
    });

    it('should identify only punctuation', () => {
      const onlyPunctuation = SourceText.create('!@#$%^&*()');
      expect(onlyPunctuation.isOnlyPunctuation()).toBe(true);
      
      const withText = SourceText.create('Hello!');
      expect(withText.isOnlyPunctuation()).toBe(false);
    });
  });

  describe('Translatability Rules', () => {
    it('should identify translatable text', () => {
      const translatableText = SourceText.create('Hello, this is a sentence to translate.');
      expect(translatableText.isTranslatable()).toBe(true);
    });

    it('should reject empty text', () => {
      const emptyText = SourceText.create('');
      expect(emptyText.isTranslatable()).toBe(false);
      expect(emptyText.isEmpty).toBe(true);
    });

    it('should reject whitespace-only text', () => {
      const whitespaceText = SourceText.create('   \n\t  ');
      expect(whitespaceText.isTranslatable()).toBe(false);
    });

    it('should reject only numbers', () => {
      const numbersText = SourceText.create('123.456');
      expect(numbersText.isTranslatable()).toBe(false);
    });

    it('should reject only punctuation', () => {
      const punctuationText = SourceText.create('!@#$%');
      expect(punctuationText.isTranslatable()).toBe(false);
    });

    it('should reject too long text', () => {
      const longText = SourceText.create('a'.repeat(50000));
      expect(longText.isTranslatable()).toBe(false);
    });
  });

  describe('Text Length Classification', () => {
    it('should identify short text', () => {
      const shortText = SourceText.create('Short');
      expect(shortText.isShortText()).toBe(true);
      expect(shortText.isLongText()).toBe(false);
    });

    it('should identify long text', () => {
      const longText = SourceText.create('a'.repeat(1001));
      expect(longText.isLongText()).toBe(true);
      expect(longText.isShortText()).toBe(false);
    });

    it('should identify medium text', () => {
      const mediumText = SourceText.create('a'.repeat(500));
      expect(mediumText.isShortText()).toBe(false);
      expect(mediumText.isLongText()).toBe(false);
    });
  });

  describe('Text Processing', () => {
    it('should extract plain text from HTML', () => {
      const htmlText = SourceText.create('<p>Hello <strong>world</strong>!</p>');
      const plainText = htmlText.getPlainText();
      
      expect(plainText).toBe('Hello world!');
    });

    it('should get text for translation', () => {
      const text = SourceText.create('Translatable text');
      const forTranslation = text.getTextForTranslation();
      
      expect(forTranslation).toBe('Translatable text');
    });

    it('should throw error for non-translatable text', () => {
      const nonTranslatable = SourceText.create('123');
      
      expect(() => {
        nonTranslatable.getTextForTranslation();
      }).toThrow('Text is not translatable');
    });

    it('should preserve formatting when requested', () => {
      const htmlText = SourceText.create('<p>Hello</p>', { preserveFormatting: true });
      const forTranslation = htmlText.getTextForTranslation();
      
      expect(forTranslation).toBe('<p>Hello</p>');
    });
  });

  describe('Text Splitting', () => {
    it('should split into paragraphs', () => {
      const multiParagraph = SourceText.create('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
      const paragraphs = multiParagraph.splitIntoParagraphs();
      
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]?.content).toBe('First paragraph.');
      expect(paragraphs[1]?.content).toBe('Second paragraph.');
      expect(paragraphs[2]?.content).toBe('Third paragraph.');
    });

    it('should split into sentences', () => {
      const multiSentence = SourceText.create('First sentence. Second sentence! Third sentence?');
      const sentences = multiSentence.splitIntoSentences();
      
      expect(sentences).toHaveLength(3);
      expect(sentences[0]?.content).toBe('First sentence');
      expect(sentences[1]?.content).toBe('Second sentence');
      expect(sentences[2]?.content).toBe('Third sentence');
    });

    it('should identify multiple paragraphs', () => {
      const singleParagraph = SourceText.create('Single paragraph text.');
      const multiParagraph = SourceText.create('First.\n\nSecond.');
      
      expect(singleParagraph.hasMultipleParagraphs()).toBe(false);
      expect(multiParagraph.hasMultipleParagraphs()).toBe(true);
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long text', () => {
      const longText = SourceText.create('This is a very long text that needs to be truncated');
      const truncated = longText.truncate(20);
      
      expect(truncated.content).toBe('This is a very long');
      expect(truncated.length).toBeLessThanOrEqual(20);
    });

    it('should return same text if within limit', () => {
      const shortText = SourceText.create('Short text');
      const truncated = shortText.truncate(100);
      
      expect(truncated.equals(shortText)).toBe(true);
    });
  });

  describe('Comparison and Equality', () => {
    it('should compare texts for equality', () => {
      const text1 = SourceText.create('Hello world');
      const text2 = SourceText.create('Hello world');
      const text3 = SourceText.create('Hello world', { type: 'html' });
      
      expect(text1.equals(text2)).toBe(true);
      expect(text1.equals(text3)).toBe(false); // Different types
    });

    it('should calculate similarity', () => {
      const text1 = SourceText.create('Hello world');
      const text2 = SourceText.create('Hello world');
      const text3 = SourceText.create('Hello there');
      const text4 = SourceText.create('Completely different');
      
      expect(text1.isSimilarTo(text2)).toBe(true);
      expect(text1.isSimilarTo(text3, 0.5)).toBe(true);
      expect(text1.isSimilarTo(text4)).toBe(false);
    });
  });

  describe('Metadata Generation', () => {
    it('should generate accurate metadata', () => {
      const text = SourceText.create('Hello world! This has multiple sentences.\n\nAnd multiple paragraphs.');
      const metadata = text.metadata;
      
      expect(metadata.wordCount).toBe(9);
      expect(metadata.characterCount).toBeGreaterThan(0);
      expect(metadata.paragraphCount).toBe(2);
      expect(metadata.containsCode).toBe(false);
      expect(metadata.containsNumbers).toBe(false);
      expect(metadata.containsHtml).toBe(false);
    });

    it('should detect code in metadata', () => {
      const codeText = SourceText.create('function test() { return 42; }');
      expect(codeText.metadata.containsCode).toBe(true);
    });

    it('should detect numbers in metadata', () => {
      const numberText = SourceText.create('The year 2023 was great');
      expect(numberText.metadata.containsNumbers).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should convert to string', () => {
      const text = SourceText.create('Hello world');
      expect(text.toString()).toBe('Hello world');
    });

    it('should serialize to JSON', () => {
      const text = SourceText.create('Hello world', { type: 'plain' });
      const json = text.toJSON();
      
      expect(json).toHaveProperty('content', 'Hello world');
      expect(json).toHaveProperty('type', 'plain');
      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('preserveFormatting', false);
    });
  });

  describe('Immutability', () => {
    it('should be immutable', () => {
      const text = SourceText.create('Hello world');
      expect(Object.isFrozen(text)).toBe(true);
    });

    it('should maintain consistency across operations', () => {
      const original = SourceText.create('Original text');
      const truncated = original.truncate(5);
      
      expect(original.content).toBe('Original text'); // Original unchanged
      expect(truncated.content).toBe('Origi');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large text efficiently', () => {
      const largeText = 'a'.repeat(10000);
      
      const startTime = Date.now();
      const sourceText = SourceText.create(largeText);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(sourceText.length).toBe(10000);
    });

    it('should split large text efficiently', () => {
      const paragraphs = Array(100).fill('This is a paragraph.').join('\n\n');
      const sourceText = SourceText.create(paragraphs);
      
      const startTime = Date.now();
      const split = sourceText.splitIntoParagraphs();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(split).toHaveLength(100);
    });
  });
});