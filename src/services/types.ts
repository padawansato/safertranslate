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
export type TranslationProviderType = 'mymemory' | 'local-llm' | 'test-stub';

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
  | 'TRANSLATION_STARTED'
  | 'TRANSLATION_START_FAILED'
  | 'TRANSLATION_PROGRESS'
  | 'TRANSLATION_COMPLETE'
  | 'TRANSLATION_FAILED'
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

/**
 * Content script → popup progress protocol.
 *
 * The content script sends TRANSLATION_STARTED as the immediate sendResponse
 * ack, then emits PROGRESS / COMPLETE / FAILED via runtime.sendMessage while
 * it translates in the background. This lets the popup track per-phase
 * progress instead of waiting for the entire page to finish.
 */
export interface TranslationStartedMessage {
  type: 'TRANSLATION_STARTED';
  total: number;
}

export interface TranslationStartFailedMessage {
  type: 'TRANSLATION_START_FAILED';
  error: string;
}

export type TranslationPhase = 'model' | 'translate';

export interface TranslationProgressMessage {
  type: 'TRANSLATION_PROGRESS';
  done: number;
  total: number;
  phase: TranslationPhase;
}

export interface TranslationCompleteMessage {
  type: 'TRANSLATION_COMPLETE';
  translatedCount: number;
  elapsedMs: number;
}

export interface TranslationFailedMessage {
  type: 'TRANSLATION_FAILED';
  error: string;
  phase: TranslationPhase;
}

export type ExtensionMessage =
  | TranslatePageMessage
  | TranslationResultMessage
  | TranslationErrorMessage
  | TranslationStartedMessage
  | TranslationStartFailedMessage
  | TranslationProgressMessage
  | TranslationCompleteMessage
  | TranslationFailedMessage
  | OffscreenTranslateMessage
  | OffscreenTranslateResultMessage
  | OffscreenModelStatusMessage
  | OffscreenLoadModelMessage;
