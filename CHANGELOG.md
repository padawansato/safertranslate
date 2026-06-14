# Changelog

All notable changes to SaferTranslate are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.4.0] - 2026-06-14

### Highlights

- 🐛 **ローカル LLM 翻訳の致命的バグを修正** — Chrome 149 で常に「0 件」になっていた問題を解消
- ⚡ **モデル先読み (prefetch)** — local-llm 選択時にモデルを先行ダウンロードし、初回翻訳の待ちを体感で短縮

### Fixed

- Chrome 149 で local-llm 翻訳が全要素失敗する問題を修正。`isSafari()` の実行時判定が Chrome 149 の `browser` グローバルを誤検知し、Chrome ビルドに存在しない `inference-engine.js` を import していた。ビルド時フラグ `__IS_SAFARI__` に置換
- 翻訳の全要素失敗を「完了 0 件」と偽装していた silent failure を修正（全滅時は `TRANSLATION_FAILED` を実エラー付きで送出）
- 初回モデルダウンロード中に誤って「翻訳停滞 (60 秒進捗なし)」と表示される問題を修正（DL 進捗で heartbeat を延命し「モデル DL 中 X%」を表示）

### Added

- ローカル LLM モデルの先読み (prefetch) — provider 選択時 / Service Worker 起動時にモデルを Cache Storage へ先行取得（Chrome のみ、既定 mymemory には影響なし）
- E2E テスト: `local-llm-prefetch`（先読み発火を SW ログで検証）。`local-llm-smoke` を実検証化（箱が出ない場合に失敗するよう変更）

### Changed

- Safari 判定を実行時ヒューリスティックからビルド時フラグ `__IS_SAFARI__`（Vite `define`）へ変更

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

[v0.4.0]: https://github.com/padawansato/safertranslate/compare/v0.3.0...v0.4.0
[v0.3.0]: https://github.com/padawansato/safertranslate/compare/v0.2.0...v0.3.0
