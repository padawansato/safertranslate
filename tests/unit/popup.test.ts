import { describe, it, expect, beforeEach } from 'vitest';
import { initBuildInfo } from '@/popup/buildInfo';

describe('initBuildInfo', () => {
  beforeEach(() => {
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
