/**
 * Jest Test Setup
 * Global test configuration and mocks for the SaferTranslate project
 */

import 'reflect-metadata'; // Required for dependency injection

// Mock Browser APIs
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    sendMessage: jest.fn()
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(),
    id: 'test-extension-id'
  },
  i18n: {
    getMessage: jest.fn((key: string) => key),
    getAcceptLanguages: jest.fn(() => Promise.resolve(['en']))
  }
};

// Mock Chrome API
Object.defineProperty(global, 'chrome', {
  value: mockBrowser,
  writable: true
});

// Mock Safari API (similar structure)
Object.defineProperty(global, 'safari', {
  value: {
    extension: {
      settings: mockBrowser.storage.local,
      secureSettings: mockBrowser.storage.sync
    },
    application: {
      activeBrowserWindow: {
        activeTab: {
          page: {
            dispatchMessage: jest.fn()
          }
        }
      }
    }
  },
  writable: true
});

// Mock DOM APIs for browser environment testing
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      innerHTML: '',
      textContent: '',
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      style: {}
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    },
    head: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    }
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'https://example.com',
      hostname: 'example.com',
      pathname: '/',
      search: '',
      hash: ''
    },
    navigator: {
      language: 'en-US',
      languages: ['en-US', 'en']
    },
    getComputedStyle: jest.fn(() => ({})),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    fetch: jest.fn(),
    console: console
  },
  writable: true
});

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockStorage,
  writable: true
});

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: jest.fn(),
  createObjectStore: jest.fn(),
  close: jest.fn()
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
  abort: jest.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null
};

const mockIDBObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  index: jest.fn(),
  createIndex: jest.fn()
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null
};

Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(() => {
      const request = { ...mockIDBRequest };
      // Simulate async success
      setTimeout(() => {
        request.result = mockIDBDatabase;
        if (request.onsuccess) request.onsuccess(new Event('success'));
      }, 0);
      return request;
    }),
    deleteDatabase: jest.fn()
  },
  writable: true
});

// Setup console warnings for common test issues
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress specific warnings in tests
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('React.createFactory')) return;
    if (message.includes('componentWillReceiveProps')) return;
    if (message.includes('componentWillMount')) return;
  }
  originalWarn(...args);
};

// Jest custom matchers
expect.extend({
  toBeTranslatable(received: any) {
    const pass = received && typeof received.isTranslatable === 'function' && received.isTranslatable();
    if (pass) {
      return {
        message: () => `expected ${received} not to be translatable`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be translatable`,
        pass: false,
      };
    }
  },

  toHaveValidLanguageCode(received: any) {
    const pass = received && typeof received.code === 'string' && received.code.length >= 2;
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid language code`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid language code`,
        pass: false,
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  createMockElement: (tagName = 'div', textContent = '', innerHTML = '') => ({
    tagName: tagName.toUpperCase(),
    textContent,
    innerHTML: innerHTML || textContent,
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getAttribute: jest.fn(),
    setAttribute: jest.fn(),
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    }
  }),

  createMockBrowserResponse: (data: any, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map()
  }),

  flushPromises: () => new Promise(resolve => setImmediate(resolve)),

  resetAllMocks: () => {
    jest.clearAllMocks();
    
    // Reset browser API mocks
    Object.values(mockBrowser.storage.local).forEach(mock => mock.mockReset());
    Object.values(mockBrowser.storage.sync).forEach(mock => mock.mockReset());
    Object.values(mockBrowser.tabs).forEach(mock => mock.mockReset());
    Object.values(mockBrowser.runtime).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    
    // Reset storage mocks
    Object.values(mockStorage).forEach(mock => {
      if (typeof mock === 'function') mock.mockReset();
    });
    
    // Reset fetch mock
    if (global.fetch && 'mockReset' in global.fetch) {
      (global.fetch as jest.Mock).mockReset();
    }
  }
};

// Type declarations for test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTranslatable(): R;
      toHaveValidLanguageCode(): R;
    }
  }

  var testUtils: {
    createMockElement: (tagName?: string, textContent?: string, innerHTML?: string) => any;
    createMockBrowserResponse: (data: any, status?: number) => any;
    flushPromises: () => Promise<void>;
    resetAllMocks: () => void;
  };
}

// Before each test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset DOM state
  if (global.document?.body) {
    global.document.body.innerHTML = '';
  }
});

// After each test cleanup
afterEach(() => {
  // Additional cleanup if needed
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};