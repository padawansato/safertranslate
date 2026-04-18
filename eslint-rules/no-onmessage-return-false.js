/**
 * ESLint rule: forbid runtime.onMessage listeners from returning anything
 * other than `true` along an execution path that has already called
 * `sendResponse`.
 *
 * Background: Safari 17 drops the synchronous `sendResponse` payload when
 * the listener returns false (or undefined), even though the MDN spec
 * suggests the sync response should be delivered first. See
 * `rules/safari-messaging.md` and Issue #8 for the production bug this
 * prevents.
 *
 * Algorithm: walk the listener body with a tiny per-path state machine.
 * Each visit returns `{ state, terminated }` where `state` is "sendResponse
 * was called along this reachable path" and `terminated` is "all sub-paths
 * end with return/throw, so nothing falls through". When merging branches
 * of an if-statement (or try/catch), only branches that fall through
 * propagate their state — this is what lets us allow the catch-all
 * `return false` in `src/background/index.ts` while still flagging
 * `sendResponse(...); return false;` in the same block.
 *
 * The rule deliberately treats nested arrow/function callbacks as
 * registering an async sendResponse — `promise.then(sendResponse)` is the
 * dominant async pattern in this codebase, and once that arrow is reached
 * the listener is committed to keeping the channel open.
 */

const ASSIGNMENT_KEYS_TO_SKIP = new Set(['parent', 'loc', 'range', 'type', 'start', 'end']);

function isOnMessageAddListener(node) {
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') return false;
  if (callee.property.type !== 'Identifier' || callee.property.name !== 'addListener') return false;
  const obj = callee.object;
  if (obj.type !== 'MemberExpression') return false;
  if (obj.property.type !== 'Identifier' || obj.property.name !== 'onMessage') return false;
  return true;
}

function getSendResponseName(funcNode) {
  if (funcNode.params.length < 3) return null;
  const p = funcNode.params[2];
  if (p.type !== 'Identifier') return null;
  return p.name;
}

function containsRef(node, name) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some((n) => containsRef(n, name));
  if (node.type === 'Identifier' && node.name === name) return true;
  for (const key of Object.keys(node)) {
    if (ASSIGNMENT_KEYS_TO_SKIP.has(key)) continue;
    if (containsRef(node[key], name)) return true;
  }
  return false;
}

function isLiteralTrue(node) {
  return Boolean(node && node.type === 'Literal' && node.value === true);
}

function makeVisitor(context, sendResponseName) {
  function visit(node, alreadyCalled) {
    if (!node || typeof node !== 'object') {
      return { state: alreadyCalled, terminated: false };
    }

    // Don't descend into nested functions for return-statement analysis,
    // but if the inner function references sendResponse it counts as an
    // async sendResponse registration along the current path.
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      const inner = containsRef(node.body, sendResponseName);
      return { state: alreadyCalled || inner, terminated: false };
    }

    if (node.type === 'ReturnStatement') {
      const argRes = visit(node.argument, alreadyCalled);
      const state = argRes.state;
      if (state && !isLiteralTrue(node.argument)) {
        context.report({ node, messageId: 'returnAfterSendResponse' });
      }
      return { state, terminated: true };
    }

    if (node.type === 'ThrowStatement') {
      const argRes = visit(node.argument, alreadyCalled);
      return { state: argRes.state, terminated: true };
    }

    if (node.type === 'CallExpression') {
      const calleeRes = visit(node.callee, alreadyCalled);
      let state = calleeRes.state;
      // Direct invocation: sendResponse(...)
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === sendResponseName
      ) {
        state = true;
      }
      // Callback registration: f(sendResponse) — `.then(sendResponse)` pattern
      for (const arg of node.arguments) {
        if (arg.type === 'Identifier' && arg.name === sendResponseName) {
          state = true;
        } else {
          state = visit(arg, state).state;
        }
      }
      return { state, terminated: false };
    }

    if (node.type === 'BlockStatement') {
      let state = alreadyCalled;
      for (const stmt of node.body) {
        const res = visit(stmt, state);
        state = res.state;
        if (res.terminated) {
          // ESLint has its own no-unreachable; we just stop tracking
          return { state, terminated: true };
        }
      }
      return { state, terminated: false };
    }

    if (node.type === 'IfStatement') {
      const condRes = visit(node.test, alreadyCalled);
      const thenRes = visit(node.consequent, condRes.state);
      const elseRes = node.alternate
        ? visit(node.alternate, condRes.state)
        : { state: condRes.state, terminated: false };
      let after = condRes.state;
      if (!thenRes.terminated) after = after || thenRes.state;
      if (!elseRes.terminated) after = after || elseRes.state;
      const bothTerminated = thenRes.terminated && elseRes.terminated;
      return { state: after, terminated: bothTerminated };
    }

    if (node.type === 'TryStatement') {
      const tryRes = visit(node.block, alreadyCalled);
      const catchRes = node.handler
        ? visit(node.handler.body, alreadyCalled)
        : { state: alreadyCalled, terminated: false };
      const merged = {
        state: tryRes.state || catchRes.state,
        terminated: tryRes.terminated && catchRes.terminated,
      };
      if (!node.finalizer) return merged;
      const finalRes = visit(node.finalizer, merged.state);
      return {
        state: merged.state || finalRes.state,
        terminated: merged.terminated || finalRes.terminated,
      };
    }

    if (node.type === 'SwitchStatement') {
      const discRes = visit(node.discriminant, alreadyCalled);
      let after = discRes.state;
      let fallthrough = discRes.state;
      for (const c of node.cases) {
        let state = fallthrough;
        let terminated = false;
        for (const stmt of c.consequent) {
          const res = visit(stmt, state);
          state = res.state;
          if (res.terminated) {
            terminated = true;
            break;
          }
        }
        if (!terminated) {
          fallthrough = state;
          after = after || state;
        } else {
          fallthrough = discRes.state;
          after = after || state;
        }
      }
      return { state: after, terminated: false };
    }

    if (
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement' ||
      node.type === 'ForStatement'
    ) {
      const testRes = node.test ? visit(node.test, alreadyCalled) : { state: alreadyCalled };
      const bodyRes = visit(node.body, testRes.state);
      return { state: testRes.state || bodyRes.state, terminated: false };
    }

    if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
      const rightRes = visit(node.right, alreadyCalled);
      const bodyRes = visit(node.body, rightRes.state);
      return { state: rightRes.state || bodyRes.state, terminated: false };
    }

    if (node.type === 'ConditionalExpression') {
      const testRes = visit(node.test, alreadyCalled);
      const conRes = visit(node.consequent, testRes.state);
      const altRes = visit(node.alternate, testRes.state);
      return { state: conRes.state || altRes.state, terminated: false };
    }

    if (node.type === 'LogicalExpression') {
      const leftRes = visit(node.left, alreadyCalled);
      const rightRes = visit(node.right, leftRes.state);
      return { state: leftRes.state || rightRes.state, terminated: false };
    }

    // Generic: visit children in source order.
    let state = alreadyCalled;
    for (const key of Object.keys(node)) {
      if (ASSIGNMENT_KEYS_TO_SKIP.has(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c === 'object' && typeof c.type === 'string') {
            state = visit(c, state).state;
          }
        }
      } else if (child && typeof child === 'object' && typeof child.type === 'string') {
        state = visit(child, state).state;
      }
    }
    return { state, terminated: false };
  }
  return visit;
}

function checkListener(funcNode, context) {
  const sendResponseName = getSendResponseName(funcNode);
  if (!sendResponseName) return;
  if (!containsRef(funcNode.body, sendResponseName)) return;

  const visit = makeVisitor(context, sendResponseName);
  const result = visit(funcNode.body, false);

  // Implicit fall-through: function returns undefined while sendResponse was
  // called along the reachable path. Report on the function itself since
  // there's no return statement to point at.
  if (result.state && !result.terminated) {
    context.report({ node: funcNode, messageId: 'returnAfterSendResponse' });
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid runtime.onMessage listeners from returning anything other than true after sendResponse has been called along that execution path',
    },
    schema: [],
    messages: {
      returnAfterSendResponse:
        'runtime.onMessage listener must `return true` along any path that calls sendResponse, to keep the message channel open on Safari. See rules/safari-messaging.md.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isOnMessageAddListener(node)) return;
        const listener = node.arguments[0];
        if (
          !listener ||
          (listener.type !== 'FunctionExpression' &&
            listener.type !== 'ArrowFunctionExpression')
        ) {
          return;
        }
        checkListener(listener, context);
      },
    };
  },
};
