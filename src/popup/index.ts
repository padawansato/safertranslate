/**
 * Popup Script - Entry point
 * Handles popup UI interactions. Translation flow is driven by a
 * phase-aware state machine (translateController) so the UI can show
 * where a translation failed (unreachable vs stalled vs API error).
 */

import type { TranslationProviderType } from '@/services/types';
import { tabs, runtime } from '@/lib/browser';
import { getSettings, saveSettings } from '@/services/settings';
import { localLlmProvider } from '@/services/providers/local-llm';
import { initBuildInfo } from './buildInfo';
import { ensureContentScriptAndSendMessage, InjectorError } from '@/lib/contentScriptInjector';
import {
  createTranslateController,
  type ControllerState,
  type TimerHandle,
} from './translateController';

const LOCAL_LLM_MODEL = 'Xenova/opus-mt-en-jap';

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

// --- Translate flow (state-machine driven) -------------------------------

let lastWorkingState: Extract<ControllerState, { phase: 'working' }> | null = null;
let elapsedTickHandle: number | undefined;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${s}s`;
}

function renderState(state: ControllerState): void {
  switch (state.phase) {
    case 'idle':
      statusDiv.textContent = '';
      statusDiv.className = 'status';
      translateBtn.disabled = false;
      break;
    case 'reaching':
      statusDiv.textContent = 'Content scriptに接続中...';
      statusDiv.className = 'status loading';
      translateBtn.disabled = true;
      break;
    case 'working': {
      translateBtn.disabled = true;
      statusDiv.className = 'status loading';
      const elapsed = formatElapsed(Date.now() - state.startedAt);
      if (state.total === 0) {
        statusDiv.textContent = `翻訳対象なし — ${elapsed}`;
      } else {
        statusDiv.textContent = `翻訳中 (${state.done}/${state.total}) — ${elapsed}`;
      }
      break;
    }
    case 'done':
      statusDiv.textContent = `翻訳完了! (${state.translatedCount}件 / ${formatElapsed(state.elapsedMs)})`;
      statusDiv.className = 'status success';
      translateBtn.disabled = false;
      break;
    case 'error':
      statusDiv.textContent = `エラー: ${state.message}`;
      statusDiv.className = 'status error';
      translateBtn.disabled = false;
      break;
  }
}

function stopElapsedTick(): void {
  if (elapsedTickHandle !== undefined) {
    clearInterval(elapsedTickHandle);
    elapsedTickHandle = undefined;
  }
}

function startElapsedTick(): void {
  stopElapsedTick();
  elapsedTickHandle = window.setInterval(() => {
    if (lastWorkingState) renderState(lastWorkingState);
  }, 500);
}

function onStateChange(state: ControllerState): void {
  log('info', `state → ${state.phase}`);
  if (state.phase === 'working') {
    lastWorkingState = state;
    startElapsedTick();
  } else {
    lastWorkingState = null;
    stopElapsedTick();
  }
  renderState(state);
}

const controller = createTranslateController({
  onStateChange,
  sendMessage: async () => {
    const activeTabs = await tabs.query({ active: true, currentWindow: true });
    const tab = activeTabs[0];
    if (!tab?.id) throw new Error('タブが見つかりません');
    try {
      return await ensureContentScriptAndSendMessage(tab.id, { type: 'TRANSLATE_PAGE' });
    } catch (err) {
      if (err instanceof InjectorError) throw new Error(err.message);
      throw err;
    }
  },
  setTimer: (ms, cb): TimerHandle => window.setTimeout(cb, ms) as unknown as TimerHandle,
  clearTimer: (handle) => window.clearTimeout(handle as unknown as number),
  now: () => Date.now(),
});

translateBtn.addEventListener('click', () => {
  log('info', `Translate clicked (provider: ${providerSelect.value})`);
  void controller.start();
});

// Bridge runtime messages (progress / complete / failed) to the controller.
runtime.onMessage.addListener((message: unknown) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return;
  const type = (message as { type: string }).type;

  if (
    type === 'TRANSLATION_PROGRESS' ||
    type === 'TRANSLATION_COMPLETE' ||
    type === 'TRANSLATION_FAILED'
  ) {
    controller.handleMessage(message);
    return;
  }

  if (type === 'OFFSCREEN_MODEL_STATUS') {
    const m = message as ModelStatusMessage;
    if (m.status === 'loading' && m.progress) {
      const pct = Math.round(m.progress.progress);
      log('info', `DL ${m.progress.file}: ${pct}%`);
    } else if (m.status === 'loading') {
      log('info', 'Model loading...');
    } else if (m.status === 'ready') {
      log('info', 'Model ready');
    } else if (m.status === 'error') {
      log('error', `Model error: ${m.progress?.file ?? 'unknown'}`);
    }
  }
});
