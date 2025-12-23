/**
 * Translation service types
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
 * Message types for Chrome extension communication
 */
export type MessageType = 'TRANSLATE_PAGE' | 'TRANSLATION_RESULT' | 'TRANSLATION_ERROR';

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

export type ExtensionMessage =
  | TranslatePageMessage
  | TranslationResultMessage
  | TranslationErrorMessage;
