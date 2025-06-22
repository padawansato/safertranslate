/**
 * SourceText Value Object
 * Represents text to be translated with metadata and validation
 * Immutable and contains business rules for text processing
 */

export interface TextMetadata {
  readonly wordCount: number;
  readonly characterCount: number;
  readonly paragraphCount: number;
  readonly containsCode: boolean;
  readonly containsNumbers: boolean;
  readonly containsHtml: boolean;
  readonly language?: string;
  readonly encoding?: string;
}

export type TextType = 
  | 'plain'      // Plain text
  | 'html'       // HTML content
  | 'markdown'   // Markdown formatted text
  | 'code'       // Programming code
  | 'json'       // JSON data
  | 'xml'        // XML content
  | 'mixed';     // Mixed content types

export interface SourceTextConfig {
  readonly content: string;
  readonly type?: TextType;
  readonly metadata?: Partial<TextMetadata>;
  readonly preserveFormatting?: boolean;
  readonly extractionContext?: string;
}

export class SourceText {
  private static readonly MAX_LENGTH = 50000; // Maximum characters for translation
  private static readonly MIN_LENGTH = 1;     // Minimum characters for translation
  private static readonly CODE_PATTERNS = [
    /```[\s\S]*?```/g,           // Code blocks
    /<code[\s\S]*?<\/code>/gi,   // HTML code tags
    /\b(function|class|const|let|var|if|else|for|while)\b/g, // JS keywords
    /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/gi,        // SQL keywords
  ];
  private static readonly HTML_PATTERN = /<[^>]*>/g;
  private static readonly NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/g;

  private readonly _content: string;
  private readonly _type: TextType;
  private readonly _metadata: TextMetadata;
  private readonly _preserveFormatting: boolean;
  private readonly _extractionContext?: string;

  private constructor(config: SourceTextConfig) {
    this._content = this.normalizeContent(config.content);
    this._type = config.type ?? this.detectType(this._content);
    this._preserveFormatting = config.preserveFormatting ?? false;
    this._extractionContext = config.extractionContext;
    this._metadata = this.generateMetadata(this._content, config.metadata);

    this.validateContent();
    Object.freeze(this);
  }

  public static create(content: string, options?: Omit<SourceTextConfig, 'content'>): SourceText {
    return new SourceText({ content, ...options });
  }

  public static fromHtml(htmlContent: string, preserveFormatting = true): SourceText {
    return new SourceText({
      content: htmlContent,
      type: 'html',
      preserveFormatting,
      extractionContext: 'html-extraction'
    });
  }

  public static fromElement(element: Element, preserveFormatting = true): SourceText {
    const content = preserveFormatting ? element.innerHTML : element.textContent || '';
    return new SourceText({
      content,
      type: 'html',
      preserveFormatting,
      extractionContext: `${element.tagName.toLowerCase()}-element`
    });
  }

  public static fromPlainText(text: string): SourceText {
    return new SourceText({
      content: text,
      type: 'plain',
      preserveFormatting: false
    });
  }

  // Getters
  public get content(): string {
    return this._content;
  }

  public get type(): TextType {
    return this._type;
  }

  public get metadata(): TextMetadata {
    return this._metadata;
  }

  public get preserveFormatting(): boolean {
    return this._preserveFormatting;
  }

  public get extractionContext(): string | undefined {
    return this._extractionContext;
  }

  public get length(): number {
    return this._content.length;
  }

  public get wordCount(): number {
    return this._metadata.wordCount;
  }

  public get isEmpty(): boolean {
    return this._content.trim().length === 0;
  }

  // Business Logic Methods
  public isTranslatable(): boolean {
    if (this.isEmpty) return false;
    if (this.length < SourceText.MIN_LENGTH) return false;
    if (this.length > SourceText.MAX_LENGTH) return false;
    if (this.isOnlyNumbers()) return false;
    if (this.isOnlyPunctuation()) return false;
    return true;
  }

  public isLongText(): boolean {
    return this.length > 1000;
  }

  public isShortText(): boolean {
    return this.length <= 100;
  }

  public containsCode(): boolean {
    return this._metadata.containsCode;
  }

  public containsHtml(): boolean {
    return this._metadata.containsHtml;
  }

  public containsNumbers(): boolean {
    return this._metadata.containsNumbers;
  }

  public isOnlyNumbers(): boolean {
    return /^\s*[\d\s.,]+\s*$/.test(this._content);
  }

  public isOnlyPunctuation(): boolean {
    return /^[\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/.test(this._content);
  }

  public hasMultipleParagraphs(): boolean {
    return this._metadata.paragraphCount > 1;
  }

  // Text Processing Methods
  public getPlainText(): string {
    let text = this._content;
    
    if (this._type === 'html') {
      text = text.replace(SourceText.HTML_PATTERN, '');
    }
    
    return text.replace(/\s+/g, ' ').trim();
  }

  public getTextForTranslation(): string {
    if (!this.isTranslatable()) {
      throw new Error('Text is not translatable');
    }

    if (this._preserveFormatting) {
      return this._content;
    }

    return this.getPlainText();
  }

  public splitIntoParagraphs(): SourceText[] {
    const paragraphs = this._content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return paragraphs.map(paragraph => 
      SourceText.create(paragraph, {
        type: this._type,
        preserveFormatting: this._preserveFormatting,
        extractionContext: `${this._extractionContext}-paragraph`
      })
    );
  }

  public splitIntoSentences(): SourceText[] {
    // Simple sentence splitting - can be enhanced with more sophisticated NLP
    const sentences = this._content
      .split(/[.!?]+\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences.map(sentence =>
      SourceText.create(sentence, {
        type: this._type,
        preserveFormatting: this._preserveFormatting,
        extractionContext: `${this._extractionContext}-sentence`
      })
    );
  }

  public truncate(maxLength: number): SourceText {
    if (this.length <= maxLength) {
      return this;
    }

    const truncated = this._content.substring(0, maxLength).trim();
    return SourceText.create(truncated, {
      type: this._type,
      preserveFormatting: this._preserveFormatting,
      extractionContext: `${this._extractionContext}-truncated`
    });
  }

  // Comparison and Equality
  public equals(other: SourceText): boolean {
    return this._content === other._content &&
           this._type === other._type &&
           this._preserveFormatting === other._preserveFormatting;
  }

  public isSimilarTo(other: SourceText, threshold = 0.8): boolean {
    const similarity = this.calculateSimilarity(other);
    return similarity >= threshold;
  }

  // Serialization
  public toString(): string {
    return this._content;
  }

  public toJSON() {
    return {
      content: this._content,
      type: this._type,
      metadata: this._metadata,
      preserveFormatting: this._preserveFormatting,
      extractionContext: this._extractionContext
    };
  }

  // Private Helper Methods
  private normalizeContent(content: string): string {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    // Normalize line endings and remove excessive whitespace
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces from each line
      .trim();
  }

  private detectType(content: string): TextType {
    // Check XML first (before HTML) to distinguish XML from HTML
    if (content.includes('<?xml') || (/^<[^>]+>/.test(content.trim()) && !SourceText.HTML_PATTERN.test(content))) {
      return 'xml';
    }

    // Check markdown before code (since code blocks can appear in markdown)
    if (content.includes('```') || content.includes('##') || /^#{1,6}\s+/.test(content)) {
      return 'markdown';
    }

    if (SourceText.HTML_PATTERN.test(content)) {
      return 'html';
    }

    if (SourceText.CODE_PATTERNS.some(pattern => pattern.test(content))) {
      return 'code';
    }

    try {
      JSON.parse(content);
      return 'json';
    } catch {
      // Not JSON
    }

    return 'plain';
  }

  private generateMetadata(content: string, partial?: Partial<TextMetadata>): TextMetadata {
    const words = content.match(/\b\w+\b/g) || [];
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return {
      wordCount: words.length,
      characterCount: content.length,
      paragraphCount: paragraphs.length,
      containsCode: SourceText.CODE_PATTERNS.some(pattern => pattern.test(content)),
      containsNumbers: SourceText.NUMBER_PATTERN.test(content),
      containsHtml: SourceText.HTML_PATTERN.test(content),
      language: partial?.language,
      encoding: partial?.encoding || 'utf-8',
      ...partial
    };
  }

  private validateContent(): void {
    if (this._content.length > SourceText.MAX_LENGTH) {
      throw new Error(`Text exceeds maximum length of ${SourceText.MAX_LENGTH} characters`);
    }
  }

  private calculateSimilarity(other: SourceText): number {
    const text1 = this.getPlainText().toLowerCase();
    const text2 = other.getPlainText().toLowerCase();

    if (text1 === text2) return 1.0;
    if (text1.length === 0 && text2.length === 0) return 1.0;
    if (text1.length === 0 || text2.length === 0) return 0.0;

    // Simple character-based similarity calculation
    const maxLength = Math.max(text1.length, text2.length);
    let matches = 0;

    for (let i = 0; i < Math.min(text1.length, text2.length); i++) {
      if (text1[i] === text2[i]) {
        matches++;
      }
    }

    return matches / maxLength;
  }
}

export default SourceText;