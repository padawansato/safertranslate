/**
 * Language Value Object
 * Represents a language in the translation system
 * Immutable and validates language codes according to ISO 639-1 standard
 */

export type LanguageCode = 
  | 'en' | 'ja' | 'zh' | 'ko' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru'
  | 'ar' | 'hi' | 'th' | 'vi' | 'nl' | 'sv' | 'da' | 'no' | 'fi' | 'pl'
  | 'cs' | 'hu' | 'ro' | 'bg' | 'hr' | 'sk' | 'sl' | 'et' | 'lv' | 'lt'
  | 'auto'; // Special code for auto-detection

export interface LanguageConfig {
  readonly code: LanguageCode;
  readonly name: string;
  readonly nativeName: string;
  readonly direction: 'ltr' | 'rtl';
  readonly family?: string;
}

export class Language {
  private static readonly LANGUAGE_CONFIGS: Record<LanguageCode, LanguageConfig> = {
    'auto': { code: 'auto', name: 'Auto Detect', nativeName: 'Auto Detect', direction: 'ltr' },
    'en': { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', family: 'Germanic' },
    'ja': { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', family: 'Japonic' },
    'zh': { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', family: 'Sino-Tibetan' },
    'ko': { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', family: 'Koreanic' },
    'es': { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', family: 'Romance' },
    'fr': { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', family: 'Romance' },
    'de': { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', family: 'Germanic' },
    'it': { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', family: 'Romance' },
    'pt': { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', family: 'Romance' },
    'ru': { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', family: 'Slavic' },
    'ar': { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', family: 'Semitic' },
    'hi': { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', family: 'Indo-European' },
    'th': { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr', family: 'Tai-Kadai' },
    'vi': { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr', family: 'Austroasiatic' },
    'nl': { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', family: 'Germanic' },
    'sv': { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr', family: 'Germanic' },
    'da': { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr', family: 'Germanic' },
    'no': { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr', family: 'Germanic' },
    'fi': { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr', family: 'Finno-Ugric' },
    'pl': { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr', family: 'Slavic' },
    'cs': { code: 'cs', name: 'Czech', nativeName: 'Čeština', direction: 'ltr', family: 'Slavic' },
    'hu': { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', direction: 'ltr', family: 'Finno-Ugric' },
    'ro': { code: 'ro', name: 'Romanian', nativeName: 'Română', direction: 'ltr', family: 'Romance' },
    'bg': { code: 'bg', name: 'Bulgarian', nativeName: 'Български', direction: 'ltr', family: 'Slavic' },
    'hr': { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', direction: 'ltr', family: 'Slavic' },
    'sk': { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', direction: 'ltr', family: 'Slavic' },
    'sl': { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', direction: 'ltr', family: 'Slavic' },
    'et': { code: 'et', name: 'Estonian', nativeName: 'Eesti', direction: 'ltr', family: 'Finno-Ugric' },
    'lv': { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', direction: 'ltr', family: 'Indo-European' },
    'lt': { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', direction: 'ltr', family: 'Indo-European' }
  };

  private constructor(private readonly config: LanguageConfig) {
    Object.freeze(this);
  }

  public static create(code: LanguageCode): Language {
    const config = this.LANGUAGE_CONFIGS[code];
    if (!config) {
      throw new Error(`Invalid language code: ${code}`);
    }
    return new Language(config);
  }

  public static fromString(codeString: string): Language {
    const code = codeString.toLowerCase() as LanguageCode;
    return this.create(code);
  }

  public static isValid(code: string): code is LanguageCode {
    return code.toLowerCase() in this.LANGUAGE_CONFIGS;
  }

  public static getAllSupported(): Language[] {
    return Object.keys(this.LANGUAGE_CONFIGS)
      .filter(code => code !== 'auto')
      .map(code => this.create(code as LanguageCode));
  }

  public static getByFamily(family: string): Language[] {
    return Object.values(this.LANGUAGE_CONFIGS)
      .filter(config => config.family === family && config.code !== 'auto')
      .map(config => new Language(config));
  }

  // Getters
  public get code(): LanguageCode {
    return this.config.code;
  }

  public get name(): string {
    return this.config.name;
  }

  public get nativeName(): string {
    return this.config.nativeName;
  }

  public get direction(): 'ltr' | 'rtl' {
    return this.config.direction;
  }

  public get family(): string | undefined {
    return this.config.family;
  }

  // Business Logic Methods
  public isAutoDetect(): boolean {
    return this.config.code === 'auto';
  }

  public isRightToLeft(): boolean {
    return this.config.direction === 'rtl';
  }

  public isSameFamily(other: Language): boolean {
    return this.config.family !== undefined 
      && other.config.family !== undefined
      && this.config.family === other.config.family;
  }

  public isCompatibleWith(other: Language): boolean {
    // Languages are compatible if they're the same or one is auto-detect
    return this.equals(other) || this.isAutoDetect() || other.isAutoDetect();
  }

  // Equality and Comparison
  public equals(other: Language): boolean {
    return this.config.code === other.config.code;
  }

  public toString(): string {
    return this.config.code;
  }

  public toDisplayString(): string {
    return `${this.config.name} (${this.config.nativeName})`;
  }

  public toJSON() {
    return {
      code: this.config.code,
      name: this.config.name,
      nativeName: this.config.nativeName,
      direction: this.config.direction,
      family: this.config.family
    };
  }

  // Static utility methods
  public static auto(): Language {
    return this.create('auto');
  }

  public static english(): Language {
    return this.create('en');
  }

  public static japanese(): Language {
    return this.create('ja');
  }

  public static chinese(): Language {
    return this.create('zh');
  }
}

export default Language;