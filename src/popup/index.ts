/**
 * Popup Script - Entry point
 * Handles popup UI interactions
 */

import type { TranslatePageMessage } from '@/services/types';

const translateBtn = document.getElementById('translate-btn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

translateBtn.addEventListener('click', async () => {
  try {
    translateBtn.disabled = true;
    statusDiv.textContent = '翻訳中...';
    statusDiv.className = 'status loading';

    // Get active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab?.id) {
      throw new Error('タブが見つかりません');
    }

    // Send message to content script
    const message: TranslatePageMessage = { type: 'TRANSLATE_PAGE' };
    const response = await chrome.tabs.sendMessage(tab.id, message);

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
