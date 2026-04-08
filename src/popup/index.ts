/**
 * Popup Script - Entry point
 * Handles popup UI interactions
 */

import type { TranslatePageMessage, TranslationProviderType } from '@/services/types';
import { tabs, runtime } from '@/lib/browser';
import { getSettings, saveSettings } from '@/services/settings';
import { localLlmProvider } from '@/services/providers/local-llm';
import { initBuildInfo } from './buildInfo';
import { ensureContentScriptAndSendMessage } from '@/lib/contentScriptInjector';

const LOCAL_LLM_MODEL = 'Xenova/m2m100_418M';

interface ModelStatusMessage {
  type: 'OFFSCREEN_MODEL_STATUS';
  status: 'loading' | 'ready' | 'error';
  progress?: { file: string; progress: number };
}

initBuildInfo();

const translateBtn = document.getElementById('translate-btn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
const debugLog = document.getElementById('debug-log') as HTMLDivElement;

function log(level: 'info' | 'warn' | 'error', msg: string): void {
  const now = new Date();
  const time = `${now.toLocaleTimeString('ja-JP', { hour12: false })}.${String(now.getMilliseconds()).slice(0, 1)}`;
  const line = document.createElement('div');
  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `${time} `;
  const msgSpan = document.createElement('span');
  msgSpan.className = `log-${level}`;
  msgSpan.textContent = `[${level.toUpperCase()}] ${msg}`;
  line.appendChild(timeSpan);
  line.appendChild(msgSpan);
  debugLog.appendChild(line);
  debugLog.scrollTop = debugLog.scrollHeight;
}

async function initProviderSelect(): Promise<void> {
  log('info', 'Initializing provider settings...');
  const [settings, llmAvailable] = await Promise.all([
    getSettings(),
    localLlmProvider.isAvailable(),
  ]);
  log('info', `Provider: ${settings.provider}, LLM available: ${llmAvailable}`);

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
  if (provider === 'local-llm') {
    statusDiv.textContent = `ローカルLLM (${LOCAL_LLM_MODEL})\n初回はモデルDLが必要です`;
    statusDiv.className = 'status loading';
  } else {
    statusDiv.textContent = '翻訳エンジン: MyMemory API';
    statusDiv.className = 'status success';
  }
});

translateBtn.addEventListener('click', async () => {
  const isLocalLlm = providerSelect.value === 'local-llm';
  log('info', `Translate clicked (provider: ${providerSelect.value})`);
  try {
    translateBtn.disabled = true;
    statusDiv.textContent = isLocalLlm ? `${LOCAL_LLM_MODEL} 準備中...` : '翻訳中...';
    statusDiv.className = 'status loading';

    const activeTabs = await tabs.query({ active: true, currentWindow: true });
    const tab = activeTabs[0];
    log('info', `Active tab: id=${tab?.id}, url=${tab?.url?.slice(0, 50)}`);

    if (!tab?.id) {
      throw new Error('タブが見つかりません');
    }

    const message: TranslatePageMessage = { type: 'TRANSLATE_PAGE' };
    log('info', 'Sending TRANSLATE_PAGE to content script...');

    const response = await ensureContentScriptAndSendMessage(tab.id, message);

    log('info', `Response: ${JSON.stringify(response)}`);

    if (response.success) {
      statusDiv.textContent = '翻訳完了!';
      statusDiv.className = 'status success';
    } else {
      throw new Error(response.error || '翻訳に失敗しました');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '不明なエラー';
    log('error', msg);
    statusDiv.textContent = `エラー: ${msg}`;
    statusDiv.className = 'status error';
  } finally {
    translateBtn.disabled = false;
  }
});

// Listen for model download progress from background/offscreen
runtime.onMessage.addListener((message: ModelStatusMessage) => {
  if (message.type !== 'OFFSCREEN_MODEL_STATUS') return;

  if (message.status === 'loading' && message.progress) {
    const pct = Math.round(message.progress.progress);
    log('info', `DL ${message.progress.file}: ${pct}%`);
    statusDiv.textContent = `${LOCAL_LLM_MODEL} DL中... ${pct}%`;
    statusDiv.className = 'status loading';
  } else if (message.status === 'loading') {
    log('info', 'Model loading...');
    statusDiv.textContent = `${LOCAL_LLM_MODEL} 準備中...`;
    statusDiv.className = 'status loading';
  } else if (message.status === 'ready') {
    log('info', 'Model ready');
  } else if (message.status === 'error') {
    log('error', `Model error: ${message.progress?.file ?? 'unknown'}`);
  }
});
