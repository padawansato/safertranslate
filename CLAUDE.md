# SaferTranslate

## 概要

Chrome翻訳拡張機能（immersivetranslate.com風バイリンガル表示）

## コマンド

- `npm run dev` - 開発ビルド（watch）
- `npm run build` - 本番ビルド
- `npm run test` - Unit tests (watch mode)
- `npm run test:run` - Unit tests (single run)
- `npm run test:e2e` - E2E tests
- `npm run typecheck` - 型チェック

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

## ファイル構成

- src/content/ - Content Script（ページ内実行）
- src/popup/ - ポップアップUI
- src/background/ - Service Worker
- src/services/ - 共通サービス（翻訳API等）

## アーキテクチャ

```
[Popup] --message--> [Background SW] --message--> [Content Script]
                                                        |
                                                        v
                                               [translator.ts]
                                                        |
                                                        v
                                               [MyMemory API]
```

## 翻訳API

- MyMemory: `https://api.mymemory.translated.net/get?q={text}&langpair=en|ja`
- 無料、APIキー不要
- レート制限: 1000語/日（匿名）

## Git運用

- MVP期: main直接開発
- タグ: セマンティックバージョニング (v0.1.0, v0.2.0...)
- MVP完了後: develop worktree運用へ移行

## Reference

See `docs/wireframe/` for visual examples of the target bilingual display behavior.

## Voice Notification

タスクの進捗状況の報告を日本語で要約を読み上げる。

- When: 1つのIssue50%・100%完了時、問題発生時、計画変更時、質問時
- ツール: `mcp__voicevox__speak` または `say` コマンド
- 設定: `speaker=1, speedScale=1.5`
