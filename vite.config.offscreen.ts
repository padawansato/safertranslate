import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, readdirSync } from 'fs';
import type { Plugin } from 'vite';
import { sharedConfig } from './vite.config.shared';

/**
 * Vite plugin to copy ONNX Runtime WASM files to dist/wasm/
 */
function wasmCopyPlugin(): Plugin {
  return {
    name: 'safertranslate-wasm-copy',
    generateBundle() {
      const onnxDir = resolve(__dirname, 'node_modules/onnxruntime-web/dist');
      try {
        const wasmFiles = readdirSync(onnxDir).filter((f) => f.endsWith('.wasm') || f.endsWith('.mjs'));
        for (const file of wasmFiles) {
          this.emitFile({
            type: 'asset',
            fileName: `wasm/${file}`,
            source: readFileSync(resolve(onnxDir, file)),
          });
        }
      } catch {
        console.warn('[wasmCopyPlugin] Could not find onnxruntime-web WASM files');
      }
    },
  };
}

// Offscreen document build: separate from main crxjs build
export default defineConfig(
  mergeConfig(sharedConfig, {
    plugins: [wasmCopyPlugin()],
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          'offscreen/offscreen': resolve(__dirname, 'src/offscreen/offscreen.html'),
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
