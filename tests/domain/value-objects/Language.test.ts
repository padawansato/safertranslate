/**
 * Language Value Object Tests
 * Test-Driven Development for Language domain value object
 */

import { Language, LanguageCode } from '@domain/value-objects/Language';

describe('Language Value Object', () => {
  describe('Construction and Validation', () => {
    it('should create a valid language from supported code', () => {
      const english = Language.create('en');
      
      expect(english.code).toBe('en');
      expect(english.name).toBe('English');
      expect(english.nativeName).toBe('English');
      expect(english.direction).toBe('ltr');
      expect(english.family).toBe('Germanic');
    });

    it('should create auto-detect language', () => {
      const auto = Language.create('auto');
      
      expect(auto.code).toBe('auto');
      expect(auto.name).toBe('Auto Detect');
      expect(auto.isAutoDetect()).toBe(true);
    });

    it('should throw error for invalid language code', () => {
      expect(() => {
        Language.create('invalid' as LanguageCode);
      }).toThrow('Invalid language code: invalid');
    });

    it('should create language from string (case insensitive)', () => {
      const english1 = Language.fromString('EN');
      const english2 = Language.fromString('en');
      const english3 = Language.fromString('En');
      
      expect(english1.equals(english2)).toBe(true);
      expect(english2.equals(english3)).toBe(true);
    });

    it('should validate language codes correctly', () => {
      expect(Language.isValid('en')).toBe(true);
      expect(Language.isValid('ja')).toBe(true);
      expect(Language.isValid('auto')).toBe(true);
      expect(Language.isValid('invalid')).toBe(false);
      expect(Language.isValid('')).toBe(false);
    });
  });

  describe('Static Factory Methods', () => {
    it('should create common languages via static methods', () => {
      expect(Language.auto().code).toBe('auto');
      expect(Language.english().code).toBe('en');
      expect(Language.japanese().code).toBe('ja');
      expect(Language.chinese().code).toBe('zh');
    });

    it('should get all supported languages (excluding auto)', () => {
      const allLanguages = Language.getAllSupported();
      
      expect(allLanguages.length).toBeGreaterThan(20);
      expect(allLanguages.every(lang => !lang.isAutoDetect())).toBe(true);
      expect(allLanguages.some(lang => lang.code === 'en')).toBe(true);
      expect(allLanguages.some(lang => lang.code === 'ja')).toBe(true);
    });

    it('should get languages by family', () => {
      const germanicLanguages = Language.getByFamily('Germanic');
      const romanceLanguages = Language.getByFamily('Romance');
      
      expect(germanicLanguages.length).toBeGreaterThan(0);
      expect(romanceLanguages.length).toBeGreaterThan(0);
      
      expect(germanicLanguages.some(lang => lang.code === 'en')).toBe(true);
      expect(germanicLanguages.some(lang => lang.code === 'de')).toBe(true);
      
      expect(romanceLanguages.some(lang => lang.code === 'es')).toBe(true);
      expect(romanceLanguages.some(lang => lang.code === 'fr')).toBe(true);
    });
  });

  describe('Business Logic Methods', () => {
    it('should identify auto-detect language', () => {
      const auto = Language.auto();
      const english = Language.english();
      
      expect(auto.isAutoDetect()).toBe(true);
      expect(english.isAutoDetect()).toBe(false);
    });

    it('should identify right-to-left languages', () => {
      const arabic = Language.create('ar');
      const english = Language.create('en');
      
      expect(arabic.isRightToLeft()).toBe(true);
      expect(english.isRightToLeft()).toBe(false);
    });

    it('should check language family compatibility', () => {
      const english = Language.create('en');
      const german = Language.create('de');
      const spanish = Language.create('es');
      
      expect(english.isSameFamily(german)).toBe(true); // Both Germanic
      expect(english.isSameFamily(spanish)).toBe(false); // Germanic vs Romance
    });

    it('should check language compatibility', () => {
      const auto = Language.auto();
      const english = Language.english();
      const japanese = Language.japanese();
      
      expect(english.isCompatibleWith(english)).toBe(true); // Same language
      expect(english.isCompatibleWith(auto)).toBe(true); // Auto is compatible with all
      expect(auto.isCompatibleWith(japanese)).toBe(true); // Auto is compatible with all
      expect(english.isCompatibleWith(japanese)).toBe(false); // Different languages
    });
  });

  describe('Equality and Comparison', () => {
    it('should compare languages for equality', () => {
      const english1 = Language.create('en');
      const english2 = Language.create('en');
      const japanese = Language.create('ja');
      
      expect(english1.equals(english2)).toBe(true);
      expect(english1.equals(japanese)).toBe(false);
    });

    it('should convert to string representation', () => {
      const english = Language.create('en');
      const japanese = Language.create('ja');
      
      expect(english.toString()).toBe('en');
      expect(japanese.toString()).toBe('ja');
    });

    it('should convert to display string', () => {
      const english = Language.create('en');
      const japanese = Language.create('ja');
      
      expect(english.toDisplayString()).toBe('English (English)');
      expect(japanese.toDisplayString()).toBe('Japanese (日本語)');
    });

    it('should serialize to JSON', () => {
      const english = Language.create('en');
      const json = english.toJSON();
      
      expect(json).toEqual({
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        family: 'Germanic'
      });
    });
  });

  describe('Immutability', () => {
    it('should be immutable', () => {
      const english = Language.create('en');
      
      // Attempt to modify should not work (TypeScript compilation would fail)
      // But we can test that the object is frozen
      expect(Object.isFrozen(english)).toBe(true);
    });

    it('should maintain referential integrity across creation methods', () => {
      const english1 = Language.create('en');
      const english2 = Language.fromString('en');
      const english3 = Language.english();
      
      expect(english1.equals(english2)).toBe(true);
      expect(english2.equals(english3)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty and whitespace language codes', () => {
      expect(() => Language.fromString('')).toThrow();
      expect(() => Language.fromString('   ')).toThrow();
    });

    it('should handle language family queries for languages without family', () => {
      const auto = Language.auto();
      const english = Language.english();
      
      expect(auto.family).toBeUndefined();
      expect(auto.isSameFamily(english)).toBe(false);
    });

    it('should maintain consistent behavior across multiple calls', () => {
      const getAllLanguages1 = Language.getAllSupported();
      const getAllLanguages2 = Language.getAllSupported();
      
      expect(getAllLanguages1.length).toBe(getAllLanguages2.length);
      
      // Should be equal but not the same reference
      getAllLanguages1.forEach((lang1, index) => {
        const lang2 = getAllLanguages2[index];
        expect(lang1?.equals(lang2!)).toBe(true);
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle creation of many language instances efficiently', () => {
      const startTime = Date.now();
      const languages: Language[] = [];
      
      for (let i = 0; i < 1000; i++) {
        languages.push(Language.create('en'));
        languages.push(Language.create('ja'));
        languages.push(Language.create('zh'));
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
      expect(languages.length).toBe(3000);
    });
  });
});