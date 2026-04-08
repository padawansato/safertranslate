/**
 * Tests for src/lib/contentScriptInjector.ts
 * Cross-browser content script injection module
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

  it('happy path: sendMessage succeeds on first try, executeScript NOT called', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    const mockResponse = { success: true };
    chromeMock.tabs.sendMessage.mockResolvedValue(mockResponse);

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(result).toEqual(mockResponse);
    expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('fallback injection success: sendMessage throws first, executeScript succeeds, retry sendMessage succeeds', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    const mockResponse = { success: true };
    chromeMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error('Could not establish connection'))
      .mockResolvedValueOnce(mockResponse);
    chromeMock.scripting.executeScript.mockResolvedValue(undefined);
    chromeMock.scripting.insertCSS.mockResolvedValue(undefined);

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 1 },
      files: ['content.js'],
    });
    expect(result).toEqual(mockResponse);
  });

  it('fallback injection, retry fails: sendMessage throws first, executeScript succeeds, retry sendMessage also throws', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    chromeMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error('Could not establish connection'))
      .mockRejectedValueOnce(new Error('Could not establish connection'));
    chromeMock.scripting.executeScript.mockResolvedValue(undefined);
    chromeMock.scripting.insertCSS.mockResolvedValue(undefined);

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(result).toEqual({
      success: false,
      error: 'Content scriptから応答がありません。ページをリロードしてお試しください。',
    });
  });

  it('Safari permission denied: sendMessage throws, executeScript throws, isSafari() returns true', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    vi.mocked(isSafari).mockReturnValue(true);
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
    chromeMock.scripting.executeScript.mockRejectedValue(new Error('Permission denied'));

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(result).toEqual({
      success: false,
      needsPermission: true,
      error: 'Safariの拡張機能の権限が必要です。Safari設定 → 拡張機能 → SaferTranslate → このサイトで「常に許可」を選択してください。',
    });
  });

  it('Chrome injection fails: sendMessage throws, executeScript throws, isSafari() returns false', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    vi.mocked(isSafari).mockReturnValue(false);
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
    chromeMock.scripting.executeScript.mockRejectedValue(new Error('Injection failed'));

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(result).toEqual({
      success: false,
      error: 'Content scriptから応答がありません。ページをリロードしてお試しください。',
    });
  });

  it('CSS injection failure is swallowed: executeScript succeeds, insertCSS rejects, still retries sendMessage successfully', async () => {
    const { ensureContentScriptAndSendMessage } = await import('@/lib/contentScriptInjector');

    const mockResponse = { success: true };
    chromeMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error('Could not establish connection'))
      .mockResolvedValueOnce(mockResponse);
    chromeMock.scripting.executeScript.mockResolvedValue(undefined);
    chromeMock.scripting.insertCSS.mockRejectedValue(new Error('CSS already loaded'));

    const result = await ensureContentScriptAndSendMessage(1, { type: 'TRANSLATE_PAGE' });

    expect(chromeMock.scripting.executeScript).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });
});
