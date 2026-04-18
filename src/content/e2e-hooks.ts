/**
 * E2E test hooks for the content script.
 *
 * Two always-on entry points let Safari/Chrome E2E drivers kick off a
 * translation without clicking the popup Translate button:
 *
 *   1. URL query flag `?safertranslate_test=1` — auto-trigger on page load
 *   2. `window.postMessage({ type: 'SAFERTRANSLATE_TEST_TRIGGER' }, '*')`
 *
 * Both call the caller-supplied `trigger` exactly the way the popup's
 * Translate button would. Because the hooks add no capability the popup
 * button doesn't already grant (a page that can postMessage can also
 * dispatch clicks), leaving them on in production is low-risk — but
 * avoid the URL flag name collision by keeping it unique enough.
 */

export const TEST_QUERY_PARAM_FLAG = 'safertranslate_test=1';
export const TEST_TRIGGER_MESSAGE_TYPE = 'SAFERTRANSLATE_TEST_TRIGGER';

type TriggerFn = () => void;

export function setupE2EHooks(w: Window, trigger: TriggerFn): void {
  if (w.location.search.includes(TEST_QUERY_PARAM_FLAG)) {
    if (w.document.readyState === 'complete') {
      // Already loaded. Defer one tick so callers observe setup synchronously
      // even if the trigger would throw.
      setTimeout(trigger, 0);
    } else {
      w.addEventListener('load', trigger, { once: true });
    }
  }

  w.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== w) return;
    const data = event.data as { type?: string } | null | undefined;
    if (!data || typeof data !== 'object') return;
    if (data.type !== TEST_TRIGGER_MESSAGE_TYPE) return;
    trigger();
  });
}
