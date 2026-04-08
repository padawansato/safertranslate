/**
 * Settings Service
 * Manages extension settings via chrome.storage.local
 */

import type { TranslationSettings, TranslationProviderType } from './types';
import { storage } from '@/lib/browser';

export const DEFAULT_SETTINGS: TranslationSettings = {
  provider: 'mymemory',
};

export async function getSettings(): Promise<TranslationSettings> {
  const result = await storage.local.get('settings');
  return (result.settings as TranslationSettings) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: TranslationSettings): Promise<void> {
  await storage.local.set({ settings });
}

export async function getProvider(): Promise<TranslationProviderType> {
  const settings = await getSettings();
  return settings.provider;
}
