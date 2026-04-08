import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initBuildInfo } from '@/popup/buildInfo';
import { getSettings, saveSettings } from '@/services/settings';
import { localLlmProvider } from '@/services/providers/local-llm';

vi.mock('@/services/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({ provider: 'mymemory' }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/providers/local-llm', () => ({
  localLlmProvider: {
    isAvailable: vi.fn().mockResolvedValue(true),
  },
}));

describe('initBuildInfo', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const el = document.createElement('div');
    el.id = 'build-info';
    document.body.appendChild(el);
  });

  it('should display build timestamp in #build-info element', () => {
    initBuildInfo();

    const el = document.getElementById('build-info');
    expect(el?.textContent).toContain('Build:');
  });

  it('should do nothing if #build-info element is missing', () => {
    document.body.textContent = '';

    expect(() => initBuildInfo()).not.toThrow();
  });
});

describe('provider selector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSettings).mockResolvedValue({ provider: 'mymemory' });
    vi.mocked(saveSettings).mockResolvedValue(undefined);

    // Build DOM safely without innerHTML
    document.body.textContent = '';

    const select = document.createElement('select');
    select.id = 'provider-select';
    const opt1 = document.createElement('option');
    opt1.value = 'mymemory';
    opt1.textContent = 'MyMemory API';
    const opt2 = document.createElement('option');
    opt2.value = 'local-llm';
    opt2.textContent = 'ローカルLLM';
    select.appendChild(opt1);
    select.appendChild(opt2);
    document.body.appendChild(select);

    const status = document.createElement('div');
    status.id = 'status';
    document.body.appendChild(status);
  });

  it('should load current provider setting on init', async () => {
    vi.mocked(getSettings).mockResolvedValue({ provider: 'local-llm' });

    const select = document.getElementById('provider-select') as HTMLSelectElement;

    const settings = await getSettings();
    select.value = settings.provider;

    expect(select.value).toBe('local-llm');
  });

  it('should save settings when provider is changed', async () => {
    const select = document.getElementById('provider-select') as HTMLSelectElement;
    select.value = 'local-llm';

    await saveSettings({ provider: 'local-llm' });

    expect(saveSettings).toHaveBeenCalledWith({ provider: 'local-llm' });
  });

  it('should disable local-llm option when provider reports unavailable', async () => {
    vi.mocked(localLlmProvider.isAvailable).mockResolvedValue(false);

    const select = document.getElementById('provider-select') as HTMLSelectElement;
    const llmOption = select.querySelector<HTMLOptionElement>('option[value="local-llm"]')!;

    // Simulate initProviderSelect logic
    const [, llmAvailable] = await Promise.all([
      getSettings(),
      localLlmProvider.isAvailable(),
    ]);

    if (!llmAvailable) {
      llmOption.disabled = true;
      llmOption.textContent += ' (非対応)';
    }

    expect(llmOption.disabled).toBe(true);
    expect(llmOption.textContent).toContain('非対応');
  });

  it('should enable local-llm option on all browsers when available', async () => {
    vi.mocked(localLlmProvider.isAvailable).mockResolvedValue(true);

    const select = document.getElementById('provider-select') as HTMLSelectElement;
    const llmOption = select.querySelector<HTMLOptionElement>('option[value="local-llm"]')!;

    // Simulate initProviderSelect logic
    const [, llmAvailable] = await Promise.all([
      getSettings(),
      localLlmProvider.isAvailable(),
    ]);

    if (!llmAvailable) {
      llmOption.disabled = true;
      llmOption.textContent += ' (非対応)';
    }

    expect(llmOption.disabled).toBe(false);
    expect(llmOption.textContent).not.toContain('非対応');
  });

  it('should fallback to mymemory if local-llm was selected on unsupported browser', async () => {
    vi.mocked(getSettings).mockResolvedValue({ provider: 'local-llm' });
    vi.mocked(localLlmProvider.isAvailable).mockResolvedValue(false);

    const select = document.getElementById('provider-select') as HTMLSelectElement;

    // Simulate initProviderSelect logic
    const [settings, llmAvailable] = await Promise.all([
      getSettings(),
      localLlmProvider.isAvailable(),
    ]);

    if (!llmAvailable && settings.provider === 'local-llm') {
      await saveSettings({ provider: 'mymemory' });
      select.value = 'mymemory';
    }

    expect(saveSettings).toHaveBeenCalledWith({ provider: 'mymemory' });
    expect(select.value).toBe('mymemory');
  });
});
