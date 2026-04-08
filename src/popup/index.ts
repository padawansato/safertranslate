/**
 * Popup Script - Entry point
 * Handles popup UI interactions
 */

import type { TranslatePageMessage, TranslationProviderType } from '@/services/types';
import { tabs } from '@/lib/browser';
import { getSettings, saveSettings } from '@/services/settings';
import { localLlmProvider } from '@/services/providers/local-llm';
import { initBuildInfo } from './buildInfo';

initBuildInfo();

const translateBtn = document.getElementById('translate-btn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const providerSelect = document.getElementById('provider-select') as HTMLSelectElement;

// Load current provider setting and check local-llm availability
async function initProviderSelect(): Promise<void> {
  const [settings, llmAvailable] = await Promise.all([
    getSettings(),
    localLlmProvider.isAvailable(),
  ]);

  if (!llmAvailable) {
    const llmOption = providerSelect.querySelector<HTMLOptionElement>('option[value="local-llm"]');
    if (llmOption) {
      llmOption.disabled = true;
      llmOption.textContent += ' (非対応)';
    }
    // Force mymemory if local-llm was previously selected on unsupported browser
    if (settings.provider === 'local-llm') {
      await saveSettings({ provider: 'mymemory' });
      providerSelect.value = 'mymemory';
      return;
    }
  }

  providerSelect.value = settings.provider;
}

initProviderSelect();

providerSelect.addEventListener('change', async () => {
  const provider = providerSelect.value as TranslationProviderType;
  await saveSettings({ provider });
  const label = provider === 'local-llm' ? 'ローカルLLM' : 'MyMemory API';
  statusDiv.textContent = `翻訳エンジン: ${label}`;
  statusDiv.className = 'status success';
});

translateBtn.addEventListener('click', async () => {
  try {
    translateBtn.disabled = true;
    statusDiv.textContent = '翻訳中...';
    statusDiv.className = 'status loading';

    // Get active tab
    const activeTabs = await tabs.query({ active: true, currentWindow: true });
    const tab = activeTabs[0];

    if (!tab?.id) {
      throw new Error('タブが見つかりません');
    }

    // Send message to content script
    const message: TranslatePageMessage = { type: 'TRANSLATE_PAGE' };
    const response = await tabs.sendMessage(tab.id, message)
      ?? { success: false, error: 'Content scriptから応答がありません' };

    if (response.success) {
      statusDiv.textContent = '翻訳完了!';
      statusDiv.className = 'status success';
    } else {
      throw new Error(response.error || '翻訳に失敗しました');
    }
  } catch (error) {
    statusDiv.textContent = `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
    statusDiv.className = 'status error';
  } finally {
    translateBtn.disabled = false;
  }
});
