# SaferTranslate

## 概要

Chrome翻訳拡張機能（immersivetranslate.com風バイリンガル表示）

## ディレクトリ構成

- `ROADMAP.md` - 開発ロードマップ

## コマンド

- `npm run dev` - 開発ビルド（watch）
- `npm run build` - 本番ビルド
- `npm run test` - Unit tests (watch mode)
- `npm run test:run` - Unit tests (single run)
- `npm run test:e2e` - E2E tests (Chrome, Playwright)
- `npm run test:safari` - Safari 拡張 E2E（macOS ローカル専用、詳細は rules/safari-messaging.md）
- `npm run typecheck` - 型チェック
- `npm run lint` - ESLint実行（手動）

## Lint

- ESLint 9.x + typescript-eslint（flat config）
- **手動実行**: `npm run lint`
- **自動実行**: Claude Code hooks (PostToolUse) で Edit/Write 後に自動実行

## Claude Code Hooks

`.claude/settings.json` に設定済み:

| Hook | トリガー | 動作 |
|------|----------|------|
| PostToolUse | Edit/Write後 | `.ts/.tsx/.js/.jsx` に ESLint --fix 自動実行 |
| PreToolUse | Edit/Write前 | `package-lock.json`, `.env`, `dist/` への書き込みブロック |

## コード規約

- TypeScript strict mode必須
- 各ファイル200行以下
- 翻訳APIは必ずservices/translator.ts経由
- Content Script内でasync/await使用時はtry-catch必須

## Linear連携

- ブランチ: `feat/PAD-{id}-{description}`
- コミット: `PAD-{id}: {message}`
- PRタイトル: `PAD-{id}: {description}`

## Chrome拡張テスト手順

1. `npm run build`
2. chrome://extensions → デベロッパーモード ON
3. 「パッケージ化されていない拡張機能を読み込む」→ dist/
4. 任意の英語ページでアイコンクリック

## Safari 拡張テスト手順

1. `npm run build:safari` — dist-safari/ を生成
2. `rm -rf safari-extension && npm run safari:convert` — Xcode プロジェクト生成
3. `npm run safari:build` — .app ビルド
4. `open /Users/$(whoami)/Library/Developer/Xcode/DerivedData/SaferTranslate-*/Build/Products/Debug/SaferTranslate.app` — 拡張登録
5. Safari 設定 → 機能拡張 → SaferTranslate を ON（初回のみ）
6. 任意の英語ページでアイコンクリック

### 再ビルド後の自動リロード

Safari は `open app` だけでは新ビルドを読まない。以下で強制リロード:

```bash
pluginkit -e ignore -i com.padawansato.SaferTranslate.Extension && \
sleep 1 && \
pluginkit -e use -i com.padawansato.SaferTranslate.Extension
```

### Safari 固有の制約

- **Service Worker で `import()` 不可** — W3C 仕様 ([w3c/ServiceWorker#1585](https://github.com/w3c/ServiceWorker/issues/1585))。local-llm は content script 内で実行
- **`content_scripts` で `"type": "module"` 非対応** — IIFE のまま利用
- **`web_accessible_resources` 必須** — content script から `import(chrome.runtime.getURL(...))` する場合、対象ファイルを宣言
- **CSP `wasm-unsafe-eval` 必須** — Transformers.js の WASM 実行に必要
- **`runtime.onMessage` と二重注入対策** — [rules/safari-messaging.md](rules/safari-messaging.md)

## ファイル構成

- src/content/ - Content Script（ページ内実行）
- src/popup/ - ポップアップUI
- src/background/ - Service Worker
- src/services/ - 共通サービス（翻訳API等）

## アーキテクチャ

### Chrome
```
[Popup] --message--> [Background SW] --message--> [Content Script]
                          |                             |
                          v                             v
                 [Offscreen Doc]                 [translator.ts]
                 Transformers.js                  /          \
                 (local-llm)              [MyMemory API]  [Background SW]
                                                            (relay for local-llm)
```

### Safari
```
[Popup] --message--> [Content Script]
                          |
                          v
                   [translator.ts]
                    /          \
            [MyMemory API]   [import(chrome.runtime.getURL('inference-engine.js'))]
                             Transformers.js 実行（Safari SW は import() 不可のため）
```

## 翻訳API

### テスト用

- MyMemory: `https://api.mymemory.translated.net/get?q={text}&langpair=en|ja`
- 無料、APIキー不要
- レート制限: 1000語/日（匿名）

### test-stub provider

- CI / 高速イテレーション用。ネットワークもモデル DL も使わない。
- 有効化: `chrome.storage.local.set({ settings: { provider: 'test-stub' } })`（popup dropdown には出していない）
- 固定辞書 (`src/services/providers/test-stub.ts`) にない入力は `[stub] <text>` を返すので、「stub が走ったか他 provider が silent に通ったか」がテストで区別できる。

## Git運用

- MVP期: main直接開発
- タグ: セマンティックバージョニング (v0.1.0, v0.2.0...)
- MVP完了後: git worktree運用へ移行

## Voice Notification

常にタスクの進捗状況の報告を

- 内容: 基本はタスクの進捗状況の報告。それ以外は技術的な解説をする。
- When: 1つのIssue50%・100%完了時、問題発生時、計画変更時、質問時
- ツール: `mcp__voicevox__speak` または `say` コマンド
- voicevox設定: `speaker=3, speedScale=1.5`
- claude設定: subagent/backgroundで実行
