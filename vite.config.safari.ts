import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import { sharedConfig } from './vite.config.shared';

// Safari build: popup + background only (ES modules OK)
// Content script is built separately via vite.config.safari-content.ts
export default defineConfig(
  mergeConfig(sharedConfig, {
    build: {
      // Disable Vite's modulePreload helper so inference-engine.js does not
      // import __vitePreload from background.js — required for content script
      // to dynamically import inference-engine at runtime without pulling in
      // background service worker code.
      modulePreload: false,
      outDir: 'dist-safari',
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/index.ts'),
          popup: resolve(__dirname, 'src/popup/index.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
  }),
);
