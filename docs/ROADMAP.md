# SaferTranslate - 公開準備ロードマップ

## 目標

**Chrome Web Store 公開可能な状態にする**

---

## 現在の状態

**v0.1.0 MVP 完了** ✅ (2025-12-23)

- 英語→日本語翻訳（MyMemory API）
- バイリンガル表示（原文下に翻訳ボックス）
- トグル機能（再クリックで削除）
- Unit Tests 35件 + E2E Tests
- ESLint（手動実行）

**v0.2.0 Claude Code Hooks** ✅ (2025-12-23)

- PostToolUse: ESLint自動実行（Edit/Write後）
- PreToolUse: ファイル保護（package-lock.json, .env, dist/）

---

## Phase 1: 地盤固め（テストで機能を保護しながら）

### 1.1 コードリファクタリング

- [ ] 各ファイルの責務確認・整理
- [ ] 不要なコード・コメントの削除
- [ ] 命名の一貫性チェック
- [ ] エラーハンドリングの見直し

### 1.2 開発環境最適化

- [ ] npm scripts の整理
- [ ] ビルド設定の確認（不要な出力がないか）
- [ ] TypeScript設定の最適化
- [ ] .gitignore の確認

### 1.3 Claude Code 役割分離（ハーネス構築）

**目的**: 開発プロセスを再現可能にし、役割ごとのガードレールを設ける

**ディレクトリ構造**:
```
.claude/
├── settings.json      # hooks設定 ✅ 完了
├── commands/          # カスタムコマンド
│   └── review.md      # /review - コードレビュー実行
├── agents/            # 役割別subagent定義
│   ├── developer.md   # 実装担当
│   └── reviewer.md    # レビュー担当
└── rules/             # パス別制約
    └── src.md         # src/配下のルール
```

**役割定義の例**:

こうしなければいけないわけではない。

| 役割 | 責務 | ツール制限 |
|------|------|-----------|
| Developer | 実装、バグ修正 | 全ツール |
| Reviewer | コードレビュー、品質確認 | Read, Grep のみ（編集不可） |

**コマンド例**:
- `/review` - Reviewerエージェントでコードレビュー
- `/lint` - ESLint実行
- `/test` - テスト実行

**効果**:
- 人間の都度指示 → 定義済みプロセスの呼び出し
- 役割の独立性（レビューが実装を汚染しない）
- 再現可能な開発フロー

### 1.4 ドキュメント整理

- [ ] README.md レビュー・更新
- [ ] CLAUDE.md → .claude/ 構造への移行
- [ ] コード内コメントの整理（過不足確認）

### 1.5 テスト強化（必要に応じて）

- [ ] テストカバレッジ確認
- [ ] エッジケースの追加
- [ ] E2Eテストの安定性確認

**完了基準**: 全テストがパスし、コードベースが整理された状態

---

## Phase 2: 公開準備

### 2.1 公開必須素材

- [ ] プライバシーポリシー（docs/privacy-policy.md）
- [ ] 説明文（日本語・英語）
- [ ] スクリーンショット 1280x800 (3-5枚)

### 2.2 manifest.json 公開対応

- [ ] `description` を英語で記載
- [ ] `homepage_url` 設定
- [ ] `permissions` 最小化確認
- [ ] `version` を "1.0.0" に

### 2.3 品質確認

- [ ] 主要サイトでの動作確認
- [ ] エラー時の挙動確認

---

## Phase 3: 公開

- [ ] dist/ を zip 化
- [ ] Chrome Developer Dashboard 提出
- [ ] 審査通過 → v1.0.0 タグ

---

## 原則

1. **テストが通る状態を維持** - リファクタリング中も `npm run test:run` がパスすること
2. **手段の目的化を避ける** - 全ての作業は「公開可能にする」という目標に紐づく
3. **過度な最適化をしない** - MVP として十分なら手を入れない

---

## Linear Issue 計画

### Phase 1: 地盤固め

| Issue | 内容 |
|-------|------|
| コードリファクタリング | 責務整理、命名統一 |
| 開発環境最適化 | scripts整理、設定確認 |
| Claude Code役割分離 | .claude/構造構築、agents/commands定義 |
| ドキュメント整理 | README更新、CLAUDE.md→.claude/移行 |

### Phase 2: 公開準備

| Issue | 内容 |
|-------|------|
| 公開素材作成 | プライバシーポリシー、スクリーンショット |
| manifest公開対応 | description、permissions確認 |
| 品質確認 | 主要サイトテスト |

---

---

## 技術検討: Safari拡張機能対応（個人利用）

### 概要

SaferTranslateをSafariブラウザ拡張機能として個人利用する場合の技術検討。
App Store申請は行わず、ローカル開発ビルドとして使用する。

### 互換性評価

| 使用API | Safari互換性 |
|---------|-------------|
| `chrome.runtime.onMessage` | ✅ |
| `chrome.tabs.query` | ✅ |
| `chrome.tabs.sendMessage` | ✅ |
| Manifest V3 Service Worker | ✅ (Safari 16.4+) |

**結論**: 現在のコードベースはSafari Web Extensionと高い互換性あり。

### 必要な作業

| 項目 | 工数 | 備考 |
|------|------|------|
| Xcodeプロジェクト変換 | 0.5日 | `safari-web-extension-converter` |
| polyfill追加 | 0.5日 | `webextension-polyfill` |
| Safari実機テスト | 1日 | 主要サイトでの動作確認 |
| **合計** | **2日** | |

### セットアップ手順（個人利用）

```bash
# 1. 拡張機能をビルド
npm run build

# 2. Xcodeプロジェクトに変換
xcrun safari-web-extension-converter ./dist \
  --project-location ./safari-extension \
  --app-name "SaferTranslate"

# 3. Xcodeでビルド
open ./safari-extension/SaferTranslate.xcodeproj
# Xcode: Product → Build

# 4. Safariで有効化
# Safari → 設定 → 詳細 → 「開発メニューを表示」
# 開発メニュー → 「署名されていない拡張機能を許可」
# Safari → 設定 → 拡張機能 → SaferTranslate を有効化
```

### コスト

| 項目 | 費用 |
|------|------|
| Apple Developer Program | **不要**（個人利用） |
| Xcode | 無料 |

### 制限事項

- Safariを再起動するたびに「署名されていない拡張機能を許可」の再有効化が必要
- 他のMacへの配布不可

### 難易度

| 観点 | 評価 |
|------|------|
| 技術的難易度 | **低** |
| 工数 | **2日程度** |
| 前提条件 | macOS + Xcode |

---

## 参考

- [Claude Code ゲームアナロジー](https://zenn.dev/yahsan2/articles/claude-code-game-analogy)
- [Safari Web Extensions | Apple Developer](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
