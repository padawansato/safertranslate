/**
 * Cross-browser API shim
 * Safari uses `browser.*`, Chrome uses `chrome.*`.
 * Both support Promise-based APIs in MV3.
 */

declare global {
   
  var browser: typeof chrome | undefined;
}

const api = globalThis.browser ?? globalThis.chrome;

export const runtime = api.runtime;
export const tabs = api.tabs;
export const storage = api.storage;
export const offscreen = (api as typeof chrome).offscreen;
export const scripting = (api as typeof chrome).scripting;

export function hasOffscreenSupport(): boolean {
  return typeof globalThis.chrome?.offscreen !== 'undefined';
}

// Injected by Vite `define` at build time: false for the Chrome build, true
// for the Safari build (see vite.config.shared.ts + vite.config.safari*.ts).
declare const __IS_SAFARI__: boolean | undefined;

/**
 * Whether this build targets Safari.
 *
 * MUST be a build-time decision, NOT runtime sniffing. The old heuristic
 * (`browser` global present && no chrome.offscreen) breaks in two ways:
 *   1. `chrome.offscreen` is ALWAYS undefined in a content script (it is a
 *      background-only API), so in a content script the heuristic collapses to
 *      "is `browser` defined?".
 *   2. Chrome 149+ now also exposes the `browser` global in content scripts,
 *      so that collapsed check returns true on Chrome → the content script
 *      wrongly took the Safari path and tried to import a non-existent
 *      inference-engine.js, failing every local-llm translation.
 * Chrome and Safari already ship from separate builds, so a define flag is
 * both correct and unambiguous.
 */
export function isSafari(): boolean {
  if (typeof __IS_SAFARI__ !== 'undefined') return __IS_SAFARI__;
  // Fallback for unit tests (Vitest has no Vite define): legacy heuristic.
  return typeof globalThis.browser !== 'undefined' && !hasOffscreenSupport();
}
