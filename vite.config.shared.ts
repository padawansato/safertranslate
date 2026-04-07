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
  },
};
