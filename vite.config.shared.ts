import { resolve } from 'path';
import type { UserConfig } from 'vite';

export const sharedConfig: UserConfig = {
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // Build target flag. Default = Chrome (false). The Safari build configs
    // override this to true. Consumed by isSafari() in src/lib/browser.ts.
    __IS_SAFARI__: JSON.stringify(false),
  },
};
