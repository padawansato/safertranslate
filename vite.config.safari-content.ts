import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import { sharedConfig } from './vite.config.shared';

// Safari content script: must be self-contained IIFE (no ES module imports)
export default defineConfig(
  mergeConfig(sharedConfig, {
    // Override the shared default: this IS the Safari target.
    define: {
      __IS_SAFARI__: JSON.stringify(true),
    },
    build: {
      outDir: 'dist-safari',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/content/index.ts'),
        formats: ['iife'],
        name: 'SaferTranslateContent',
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          assetFileNames: 'content.[ext]',
        },
      },
    },
  }),
);
