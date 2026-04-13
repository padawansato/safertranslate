/**
 * Idempotent setup for content scripts.
 *
 * A content script may be injected twice into the same isolated world:
 *   1. Normally, via the extension's `content_scripts` manifest entry
 *   2. Again, via `scripting.executeScript` fallback (see
 *      `contentScriptInjector.ts`), for example when the manifest-based
 *      injection was skipped or when the popup's Step-1 sendMessage was
 *      misread as "no content script" on Safari (see #8).
 *
 * Because both instances share the same isolated-world `window`, a flag
 * on that window is a reliable singleton signal: the second module run
 * sees the flag already set and skips its side effects.
 *
 * See rules/safari-messaging.md for the full bug history and rationale.
 */
export function runOnceInContentScript(guardKey: string, setup: () => void): void {
  const w = window as unknown as Record<string, unknown>;

  if (w[guardKey]) return;

  // Set the flag *before* running setup so a throwing setup does not
  // cause an infinite retry loop on the next re-injection. The caller
  // owns error handling; we propagate the exception unchanged.
  w[guardKey] = true;
  setup();
}
