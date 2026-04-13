/**
 * Tests for src/lib/contentScriptInjector.ts
 * Cross-browser content script injection module.
 *
 * Contract: returns the raw content script response on success; throws
 * InjectorError on injection or messaging failure (so the caller can
 * surface a user-friendly reason without parsing {success: false} shapes).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSafari } from '@/lib/browser';
import { chromeMock } from '../setup';

vi.mock('@/lib/browser', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/browser')>();
  return {
    ...original,
    isSafari: vi.fn(() => false), // default: Chrome
  };
});

describe('ensureContentScriptAndSendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSafari).mockReturnValue(false);
  });

  it('happy path: returns raw response on first sendMessage success, executeScript NOT called', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    const ack = { type: 'TRANSLATION_STARTED', total: 42 };
    chromeMock.tabs.sendMessage.mockResolvedValue(ack);

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(result).toEqual(ack);
    expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('fallback injection: first sendMessage throws, executeScript succeeds, retry returns raw response', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    const ack = { type: 'TRANSLATION_STARTED', total: 10 };
    chromeMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error('Could not establish connection'))
      .mockResolvedValueOnce(ack);
    chromeMock.scripting.executeScript.mockResolvedValue(undefined);
    chromeMock.scripting.insertCSS.mockResolvedValue(undefined);

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 1 },
      files: ['content.js'],
    });
    expect(result).toEqual(ack);
  });

  it('fallback injection, retry fails: throws InjectorError with reload message', async () => {
    const { ensureContentScriptAndSendMessage, InjectorError } = await import('@/lib/contentScriptInjector');

    chromeMock.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
    chromeMock.scripting.executeScript.mockResolvedValue(undefined);
    chromeMock.scripting.insertCSS.mockResolvedValue(undefined);

    let caught: unknown;
    try {
      await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(InjectorError);
    expect((caught as Error).message).toMatch(/ページをリロード/);
    expect((caught as InstanceType<typeof InjectorError>).needsPermission).toBe(false);
  });

  it('Safari permission denied: throws InjectorError with needsPermission=true', async () => {
    const { ensureContentScriptAndSendMessage, InjectorError } = await import('@/lib/contentScriptInjector');

    vi.mocked(isSafari).mockReturnValue(true);
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
    chromeMock.scripting.executeScript.mockRejectedValue(new Error('Permission denied'));

    let caught: unknown;
    try {
      await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(InjectorError);
    expect((caught as InstanceType<typeof InjectorError>).needsPermission).toBe(true);
    expect((caught as Error).message).toMatch(/Safari/);
  });

  it('Chrome injection fails: throws InjectorError without needsPermission', async () => {
    const { ensureContentScriptAndSendMessage, InjectorError } = await import('@/lib/contentScriptInjector');

    vi.mocked(isSafari).mockReturnValue(false);
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
    chromeMock.scripting.executeScript.mockRejectedValue(new Error('Injection failed'));

    let caught: unknown;
    try {
      await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(InjectorError);
    expect((caught as InstanceType<typeof InjectorError>).needsPermission).toBe(false);
    expect((caught as Error).message).toMatch(/リロード/);
  });

  it('CSS injection failure is swallowed: executeScript succeeds, insertCSS rejects, retry returns raw response', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    const ack = { type: 'TRANSLATION_STARTED', total: 5 };
    chromeMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error('Could not establish connection'))
      .mockResolvedValueOnce(ack);
    chromeMock.scripting.executeScript.mockResolvedValue(undefined);
    chromeMock.scripting.insertCSS.mockRejectedValue(new Error('CSS already loaded'));

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(chromeMock.scripting.executeScript).toHaveBeenCalled();
    expect(result).toEqual(ack);
  });
});
