/**
 * Translation service types for SaferTranslate
 */

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceText: string;
  detectedLanguage?: string;
}

export interface TranslationError {
  code: string;
  message: string;
}

/**
 * Translation provider
 */
export type TranslationProviderType = 'mymemory' | 'local-llm';

export interface TranslationProvider {
  readonly name: TranslationProviderType;
  translate(text: string, options?: Partial<TranslationRequest>): Promise<TranslationResponse>;
  isAvailable(): Promise<boolean>;
}

export interface TranslationSettings {
  provider: TranslationProviderType;
}

/**
 * Message types for Chrome extension communication
 */
export type MessageType =
  | 'TRANSLATE_PAGE'
  | 'TRANSLATION_RESULT'
  | 'TRANSLATION_ERROR'
  | 'OFFSCREEN_TRANSLATE'
  | 'OFFSCREEN_TRANSLATE_RESULT'
  | 'OFFSCREEN_MODEL_STATUS'
  | 'OFFSCREEN_LOAD_MODEL';

export interface TranslatePageMessage {
  type: 'TRANSLATE_PAGE';
}

export interface TranslationResultMessage {
  type: 'TRANSLATION_RESULT';
  data: TranslationResponse[];
}

export interface TranslationErrorMessage {
  type: 'TRANSLATION_ERROR';
  error: TranslationError;
}

export interface OffscreenTranslateMessage {
  type: 'OFFSCREEN_TRANSLATE';
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface OffscreenTranslateResultMessage {
  type: 'OFFSCREEN_TRANSLATE_RESULT';
  translatedText: string;
  sourceText: string;
}

export interface OffscreenModelStatusMessage {
  type: 'OFFSCREEN_MODEL_STATUS';
  status: 'loading' | 'ready' | 'error';
  error?: string;
}

export interface OffscreenLoadModelMessage {
  type: 'OFFSCREEN_LOAD_MODEL';
}

export type ExtensionMessage =
  | TranslatePageMessage
  | TranslationResultMessage
  | TranslationErrorMessage
  | OffscreenTranslateMessage
  | OffscreenTranslateResultMessage
  | OffscreenModelStatusMessage
  | OffscreenLoadModelMessage;
