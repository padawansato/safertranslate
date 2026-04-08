/**
 * Settings Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, saveSettings, getProvider, DEFAULT_SETTINGS } from '@/services/settings';

describe('settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should default to mymemory provider', () => {
      expect(DEFAULT_SETTINGS.provider).toBe('mymemory');
    });
  });

  describe('getSettings', () => {
    it('should return default settings when storage is empty', async () => {
      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const settings = await getSettings();

      expect(settings).toEqual({ provider: 'mymemory' });
      expect(chrome.storage.local.get).toHaveBeenCalledWith('settings');
    });

    it('should return stored settings', async () => {
      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        settings: { provider: 'local-llm' },
      });

      const settings = await getSettings();

      expect(settings).toEqual({ provider: 'local-llm' });
    });
  });

  describe('saveSettings', () => {
    it('should save settings to chrome.storage.local', async () => {
      await saveSettings({ provider: 'local-llm' });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: { provider: 'local-llm' },
      });
    });
  });

  describe('getProvider', () => {
    it('should return provider name from settings', async () => {
      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        settings: { provider: 'local-llm' },
      });

      const provider = await getProvider();

      expect(provider).toBe('local-llm');
    });

    it('should return default provider when storage is empty', async () => {
      (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const provider = await getProvider();

      expect(provider).toBe('mymemory');
    });
  });
});
