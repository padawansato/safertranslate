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
