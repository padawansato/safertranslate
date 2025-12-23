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
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// @ts-expect-error - Mocking global chrome object
globalThis.chrome = chromeMock;

// Export for use in tests
export { chromeMock };
