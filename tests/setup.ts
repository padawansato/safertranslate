// Vitest setup file
// Add global mocks and setup here

import { vi } from 'vitest';

// Mock chrome API for tests
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    getContexts: vi.fn().mockResolvedValue([]),
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    ContextType: {
      OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT',
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  offscreen: {
    createDocument: vi.fn().mockResolvedValue(undefined),
    Reason: {
      WORKERS: 'WORKERS',
    },
  },
  scripting: {
    executeScript: vi.fn(),
    insertCSS: vi.fn(),
  },
};

// @ts-expect-error - Mocking global chrome/browser objects
globalThis.chrome = chromeMock;
// @ts-expect-error - Safari uses browser.* namespace
globalThis.browser = chromeMock;

// Export for use in tests
export { chromeMock };
