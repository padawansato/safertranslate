# SaferTranslate

Chrome / Safari 用のシンプルなバイリンガル翻訳拡張機能。原文の下に翻訳を表示する [immersivetranslate.com](https://immersivetranslate.com) インスパイア型 UI。

> Status: v0.4.0 — GitHub Release 配布段階（Chrome Web Store / Safari App Store 未公開）

## 特徴

- **バイリンガル表示** — 原文の下に翻訳ボックスを追加表示
- **トグル翻訳** — 拡張アイコン再クリックで翻訳を削除
- **複数の翻訳プロバイダ**
  - MyMemory API（無料・APIキー不要、匿名 1000 語/日）
  - ローカル LLM（Transformers.js + m2m100、ネットワーク不要）
  - test-stub（CI / 開発用）
- **Chrome + Safari 対応** — Manifest V3 ベース、両ブラウザで同じコードベース

## インストール

### 方法 A: GitHub Release から zip をダウンロード（推奨）

[Releases](https://github.com/padawansato/safertranslate/releases) から最新版を取得。

#### Chrome

1. `safertranslate-vX.Y.Z-chrome.zip` をダウンロード・展開
2. `chrome://extensions` を開く → 「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」 → 展開したフォルダを選択

#### Safari (macOS)

1. `safertranslate-vX.Y.Z-safari.zip` をダウンロード・展開
2. 展開した `SaferTranslate.app` を `/Applications/` に移動
3. 未署名 `.app` のため Gatekeeper 警告が出ます。以下で隔離属性を解除:
   ```bash
   xattr -dr com.apple.quarantine /Applications/SaferTranslate.app
   ```
4. `SaferTranslate.app` を一度だけ起動（Safari に拡張を登録するため）
5. Safari → 設定 → 詳細 →「メニューバーに開発メニューを表示」を ON
6. Safari → 開発メニュー →「未署名の機能拡張を許可」を ON
7. Safari → 設定 → 機能拡張 → SaferTranslate を ON

> **制約**: Safari を再起動するたびに「未署名の機能拡張を許可」が無効化されるため、6 を再実行する必要があります（Apple の仕様）

### 方法 B: ソースからビルド

```bash
git clone https://github.com/padawansato/safertranslate.git
cd safertranslate
npm install
npm run build           # Chrome 用
npm run build:safari    # Safari 用 (macOS のみ)
```

Safari の Xcode プロジェクト生成・ビルドは [CLAUDE.md](CLAUDE.md) を参照。

## 使い方

1. 翻訳したい英語ページを開く
2. SaferTranslate アイコンをクリック
3. 「Translate Page」ボタンをクリック
4. 再度クリックすると翻訳を削除

ポップアップから翻訳プロバイダ（MyMemory / Local LLM）を切替可能。

### ローカル LLM の初回利用

`Local LLM` は端末内でモデル（m2m100、約 475MB）を実行するため、初回だけモデルのダウンロードが必要です。

- ポップアップで **プロバイダを `Local LLM` に切り替えた時点**で、バックグラウンドのダウンロードが始まります（翻訳ボタンを押す前に先読み）。既定は MyMemory なので、選ばない限りダウンロードは発生しません。
- ダウンロード中はポップアップに「モデルDL中 X%」と進捗が出ます（約 100 秒・回線依存）。完了前に翻訳を押しても、DL 完了後に自動で翻訳されます。
- 一度ダウンロードすればブラウザのキャッシュに保存され、2 回目以降は数秒で読み込まれます（ネットワーク不要）。

> ⚠️ ブラウザのキャッシュが消える（閲覧データ消去・拡張の再インストール・ストレージ逼迫による退避など）と、次回また初回ダウンロードが必要になります。現状その状態を事前に知る手段はありません（[改善検討中](#roadmap)）。

## 開発

```bash
npm run dev              # 開発モード (watch)
npm run test             # Unit tests (watch mode)
npm run test:run         # Unit tests (single run)
npm run test:e2e         # E2E (Chrome, Playwright)
npm run test:safari      # E2E (Safari, macOS only)
npm run typecheck        # 型チェック
npm run lint             # ESLint
npm run package:chrome   # Chrome 配布 zip を releases/ に生成
npm run package:safari   # Safari .app zip を releases/ に生成
npm run package          # 両方生成
```

### DevTools でのデバッグ

| 対象 | 開き方 |
|------|--------|
| Content Script | ページで F12 → Console |
| Popup | 拡張機能アイコン右クリック →「ポップアップを検証」 |
| Service Worker (Chrome) | `chrome://extensions` → 拡張機能の「Service Worker」リンク |
| Web Inspector (Safari) | Safari → 開発メニュー → Web Inspector |

### よくある問題

| 症状 | 確認ポイント |
|------|-------------|
| 翻訳ボックスが出ない | Console でエラー確認、API レート制限の可能性 |
| アイコンクリックで反応なし | Service Worker が Inactive なら拡張機能を再読み込み |
| Safari でアイコンが反応しない | 設定で拡張が ON か、再起動後に「未署名拡張を許可」を再有効化したか |
| ローカル LLM のロードが遅い | 初回のみモデル DL（約 475MB）。`Local LLM` 選択時に先読み開始、2 回目以降はキャッシュから数秒 |
| ローカル LLM が再びダウンロードを始める | 閲覧データ消去・拡張再インストール・ストレージ逼迫などでモデルキャッシュが失われた可能性 |

## 技術スタック

- TypeScript (strict mode)
- Vite + @crxjs/vite-plugin
- Chrome Extension Manifest V3
- Transformers.js v3 (Local LLM, m2m100)
- Vitest (Unit Tests)
- Playwright (E2E Tests, Chrome / Safari)
- ESLint 9.x + typescript-eslint (custom rule: `no-onmessage-return-false`)

## Roadmap

公開準備の進捗は [docs/ROADMAP.md](docs/ROADMAP.md) を参照。

## License

MIT License — see [LICENSE](LICENSE) for details.
