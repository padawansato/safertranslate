# SaferTranslate - 公開準備ロードマップ

## 目標

**Chrome Web Store 公開可能な状態にする**

---

## 現在の状態

**v0.1.0 MVP 完了** ✅ (2024-12-23)

- 英語→日本語翻訳（MyMemory API）
- バイリンガル表示（原文下に翻訳ボックス）
- トグル機能（再クリックで削除）
- Unit Tests 35件 + E2E Tests
- ESLint（手動実行）

**v0.2.0 Claude Code Hooks** ✅ (2024-12-23)

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

## 参考

- [Claude Code ゲームアナロジー](https://zenn.dev/yahsan2/articles/claude-code-game-analogy)
