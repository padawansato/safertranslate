import { defineConfig, mergeConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import { sharedConfig } from './vite.config.shared';

export default defineConfig(
  mergeConfig(sharedConfig, {
    plugins: [crx({ manifest })],
    build: {
      outDir: 'dist',
    },
  }),
);
