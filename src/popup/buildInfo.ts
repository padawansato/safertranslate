declare const __BUILD_TIME__: string;

export function initBuildInfo(): void {
  const el = document.getElementById('build-info');
  if (!el) return;

  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';
  el.textContent = `Build: ${buildTime}`;
}
