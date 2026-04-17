/**
 * Tests for eslint-rules/no-onmessage-return-false.
 *
 * The rule forbids `return false` (or any non-true return) inside a
 * `runtime.onMessage.addListener` callback along an execution path that
 * has already called `sendResponse`. See rules/safari-messaging.md (#8).
 */
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../../../eslint-rules/no-onmessage-return-false.js';

// Wire RuleTester to vitest's globals so RuleTester.run works without mocha.
(RuleTester as unknown as { it: typeof it }).it = it;
(RuleTester as unknown as { describe: typeof describe }).describe = describe;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-onmessage-return-false', rule as never, {
  valid: [
    // A: textbook correct — sendResponse then return true
    `runtime.onMessage.addListener((msg, sender, sendResponse) => {
       sendResponse({});
       return true;
     });`,

    // B: early-return false guard before any sendResponse call is fine
    `runtime.onMessage.addListener((msg, sender, sendResponse) => {
       if (msg.type !== 'X') return false;
       sendResponse({ ok: true });
       return true;
     });`,

    // C: catch-all return false where sendResponse only lives inside an
    //    if-body that already returned true (background/index.ts pattern)
    `runtime.onMessage.addListener((msg, sender, sendResponse) => {
       if (msg.type === 'X') {
         doAsync().then(sendResponse);
         return true;
       }
       return false;
     });`,

    // D: fire-and-forget listener without sendResponse param at all
    //    (popup/index.ts pattern). Rule should skip entirely.
    `runtime.onMessage.addListener((msg) => {
       if (!msg) return;
       handle(msg);
     });`,

    // E: chrome.runtime.onMessage is the same API and must be covered too
    `chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
       sendResponse({});
       return true;
     });`,

    // F: try-catch with sendResponse in both branches, return true at end
    //    (content/index.ts pattern)
    `runtime.onMessage.addListener((msg, _sender, sendResponse) => {
       try {
         sendResponse({ ok: true });
       } catch (err) {
         sendResponse({ error: String(err) });
       }
       return true;
     });`,

    // G: ignore unrelated addListener calls
    `someObject.method((arg) => arg);`,

    // H: ignore non-onMessage event listeners (e.g. onConnect)
    `runtime.onConnect.addListener((port) => { port.disconnect(); return false; });`,

    // I: nested if with sendResponse only on the return-true branch is OK
    `runtime.onMessage.addListener((msg, sender, sendResponse) => {
       if (cond1) {
         if (cond2) {
           promise.then(sendResponse);
           return true;
         }
         return false;
       }
       return false;
     });`,

    // J: listener that has 3 params but never actually uses sendResponse
    //    (defensive — may signal pass-through "I don't handle this")
    `runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
       if (msg.type !== 'X') return false;
       return false;
     });`,
  ],
  invalid: [
    // 1: textbook bug — sendResponse + return false
    {
      code: `runtime.onMessage.addListener((msg, sender, sendResponse) => {
        sendResponse({});
        return false;
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },

    // 2: sendResponse in try, return false at end of function body
    {
      code: `runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        try {
          sendResponse({});
        } catch (e) { /* ignore */ }
        return false;
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },

    // 3: sendResponse + bare return; (implicit undefined)
    {
      code: `runtime.onMessage.addListener((msg, sender, sendResponse) => {
        sendResponse({});
        return;
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },

    // 4: sendResponse + no explicit return (implicit undefined fall-through)
    {
      code: `runtime.onMessage.addListener((msg, sender, sendResponse) => {
        sendResponse({});
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },

    // 5: bug inside an if-then branch
    {
      code: `runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (cond) {
          sendResponse({});
          return false;
        }
        return true;
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },

    // 6: chrome.runtime.onMessage variant of the bug
    {
      code: `chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
        sendResponse({});
        return false;
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },

    // 7: async chain registers sendResponse, then a sibling return false
    //    (background-style code with the bug introduced)
    {
      code: `runtime.onMessage.addListener((msg, sender, sendResponse) => {
        doAsync().then(sendResponse);
        return false;
      });`,
      errors: [{ messageId: 'returnAfterSendResponse' }],
    },
  ],
});
