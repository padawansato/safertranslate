/**
 * Tests for src/content/index.ts
 *
 * Focus: the message listener contract that prevents the Safari
 * double-injection bug (#8). See rules/safari-messaging.md for the
 * full rationale.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromeMock } from '../setup';

// Mocks for content script dependencies.
vi.mock('@/services/translator', () => ({
  translate: vi.fn(async (text: string) => ({ translatedText: `[ja] ${text}` })),
}));
vi.mock('@/content/textExtractor', () => ({
  extractTranslatableElements: vi.fn(() => []),
}));
vi.mock('@/content/domInjector', () => ({
  injectTranslation: vi.fn(),
  removeAllTranslations: vi.fn(),
  hasTranslations: vi.fn(() => false),
}));
// styles.css is imported for side effects; stub it out.
vi.mock('@/content/styles.css', () => ({}));

const WINDOW_GUARD_KEY = '__safertranslate_listener_v1';

function clearWindowGuard(): void {
  const w = window as unknown as Record<string, unknown>;
  delete w[WINDOW_GUARD_KEY];
}

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (value: unknown) => void,
) => boolean;

function getRegisteredListener(): MessageListener {
  const calls = chromeMock.runtime.onMessage.addListener.mock.calls;
  if (calls.length === 0) throw new Error('No listener registered yet');
  return calls[calls.length - 1][0] as MessageListener;
}

async function loadContentScript(): Promise<void> {
  await import('@/content/index');
}

describe('content script — listener registration', () => {
  beforeEach(() => {
    clearWindowGuard();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('registers exactly one runtime.onMessage listener on first load', async () => {
    await loadContentScript();
    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  });

  it('sets the window-level guard flag after registration', async () => {
    await loadContentScript();
    const w = window as unknown as Record<string, unknown>;
    expect(w[WINDOW_GUARD_KEY]).toBe(true);
  });

  it('does NOT register a second listener if the module is loaded twice', async () => {
    await loadContentScript();
    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);

    // Simulate executeScript re-injection: reset the module cache so the
    // top-level code runs again, but keep the window guard intact.
    vi.resetModules();
    await loadContentScript();

    // Still 1 — the guard prevented the second registration.
    expect(chromeMock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
  });

  it('skips registration entirely if the guard is already set before first load', async () => {
    const w = window as unknown as Record<string, unknown>;
    w[WINDOW_GUARD_KEY] = true;

    await loadContentScript();
    expect(chromeMock.runtime.onMessage.addListener).not.toHaveBeenCalled();
  });
});

describe('content script — message handling contract', () => {
  beforeEach(() => {
    clearWindowGuard();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns true for TRANSLATE_PAGE so Safari keeps the channel open', async () => {
    const extractor = await import('@/content/textExtractor');
    vi.mocked(extractor.extractTranslatableElements).mockReturnValueOnce([]);

    await loadContentScript();
    const listener = getRegisteredListener();

    const sendResponse = vi.fn();
    const result = listener({ type: 'TRANSLATE_PAGE' }, {}, sendResponse);

    expect(result).toBe(true);
  });

  it('returns false for unrelated messages so other listeners can handle them', async () => {
    await loadContentScript();
    const listener = getRegisteredListener();

    const sendResponse = vi.fn();
    const result = listener({ type: 'SOMETHING_ELSE' }, {}, sendResponse);

    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('calls sendResponse synchronously with TRANSLATION_STARTED and the element count', async () => {
    const extractor = await import('@/content/textExtractor');
    const fakeElements = Array.from({ length: 7 }, (_, i) => ({
      element: document.createElement('p'),
      text: `text ${i}`,
    }));
    vi.mocked(extractor.extractTranslatableElements).mockReturnValueOnce(fakeElements);

    await loadContentScript();
    const listener = getRegisteredListener();

    const sendResponse = vi.fn();
    listener({ type: 'TRANSLATE_PAGE' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({
      type: 'TRANSLATION_STARTED',
      total: 7,
    });
  });

  it('acks with total:0 and emits COMPLETE when translations already exist (toggle off)', async () => {
    const domInjector = await import('@/content/domInjector');
    vi.mocked(domInjector.hasTranslations).mockReturnValueOnce(true);

    await loadContentScript();
    const listener = getRegisteredListener();

    const sendResponse = vi.fn();
    const result = listener({ type: 'TRANSLATE_PAGE' }, {}, sendResponse);

    expect(result).toBe(true);
    expect(domInjector.removeAllTranslations).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ type: 'TRANSLATION_STARTED', total: 0 });
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRANSLATION_COMPLETE', translatedCount: 0 }),
    );
  });

  it('sends TRANSLATION_START_FAILED if element extraction throws', async () => {
    const extractor = await import('@/content/textExtractor');
    vi.mocked(extractor.extractTranslatableElements).mockImplementationOnce(() => {
      throw new Error('extractor boom');
    });

    await loadContentScript();
    const listener = getRegisteredListener();

    const sendResponse = vi.fn();
    const result = listener({ type: 'TRANSLATE_PAGE' }, {}, sendResponse);

    expect(result).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRANSLATION_START_FAILED' }),
    );
  });
});
