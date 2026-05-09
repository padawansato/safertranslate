# Changelog

All notable changes to SaferTranslate are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.3.0] - 2026-05-09

### Highlights

- 🦁 **Safari 拡張対応** — macOS の Safari でも同じバイリンガル翻訳が動作
- 🤖 **ローカル LLM 翻訳** — Transformers.js でオフライン翻訳、プライバシー重視
- 📦 **GitHub Release 配布開始** — Chrome zip + Safari .app zip でインストールが簡単に

### Added

- Safari 拡張機能対応 (Manifest V3, Safari 16.4+) — #1, PAD-3, #4
- ローカル LLM 翻訳 (Chrome, Transformers.js v3 + MarianMT / m2m100)
- Safari 用ローカル LLM 実装 (Service Worker 制約のため content script 内で実行)
- test-stub 翻訳 provider (CI / 高速イテレーション用、ネットワークもモデル DL も使わない) — #5, #16
- フェーズ別タイムアウト + 進捗表示 UI — PAD-6
- ESLint カスタムルール `no-onmessage-return-false` (Safari の messaging 仕様に対応) — #11
- Safari 拡張 E2E 自動化スクリプト (`npm run test:safari`) — #12
- リリース zip パッケージング (`npm run package:chrome` / `npm run package:safari`)

### Changed

- ローカル LLM モデルを `Xenova/m2m100_418M` に変更（モデル名表示・進捗 UI を追加）
- Transformers.js を v3 にダウングレード（ONNX 互換性のため）
- CSP に `wasm-unsafe-eval` を追加（WASM 実行に必要）

### Fixed

- Safari content script が注入されず翻訳が動作しない問題 — PAD-3, #4
- Safari content script の二重注入 — #8
- `runOnceInContentScript` guard trip 時のサイレント挙動 — #10
- `.mjs` ファイルが Safari ビルドにコピーされない問題

### Internal

- Claude Code hooks: PostToolUse で ESLint --fix 自動実行
- `Bash(rm)` を deny に追加（うっかり削除を防ぐ安全策）— #14
- Safari content script 二重注入の helper + tests + ルールドキュメント — #8

[v0.3.0]: https://github.com/padawansato/safertranslate/compare/v0.2.0...v0.3.0
