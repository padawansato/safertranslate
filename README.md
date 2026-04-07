# SaferTranslate

バイリンガル表示に対応したシンプルなChrome翻訳拡張機能

> Inspired by [immersivetranslate.com](https://immersivetranslate.com)

## Key Features

### Core Features

- 翻訳：英語→日本語（MyMemory API使用）
- Bilingual Display: 原文の下に翻訳ボックスを表示
- トグル機能: 再クリックで翻訳を削除

## インストール

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build
```

### Chrome拡張機能としてロード

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

## 使い方

1. 翻訳したいページを開く
2. SaferTranslateアイコンをクリック
3. 「Translate Page」ボタンをクリック
4. 再度クリックすると翻訳を削除

## 開発

```bash
# 開発モード（ファイル変更を監視）
npm run dev

# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e

# 型チェック
npm run typecheck
```

## デバッグ方法

### 拡張機能のロードと動作確認

```bash
# 1. ビルド
npm run build

# 2. Chrome で chrome://extensions を開く
# 3. 「デベロッパーモード」ON
# 4. 「パッケージ化されていない拡張機能を読み込む」→ dist/ を選択
# 5. 任意の英語ページで拡張機能アイコンをクリック
```

### DevTools でのデバッグ

| 対象 | 開き方 |
|------|--------|
| Content Script | ページで F12 → Console |
| Popup | 拡張機能アイコン右クリック → 「ポップアップを検証」 |
| Service Worker | chrome://extensions → 拡張機能の「Service Worker」リンク |

### Console出力の確認

```
[SaferTranslate] Content script loaded  ← Content Script読み込み成功
[SaferTranslate] Translating X elements ← 翻訳処理開始
```

### よくある問題

| 症状 | 確認ポイント |
|------|-------------|
| 翻訳ボックスが出ない | Console でエラー確認、APIレート制限の可能性 |
| アイコンクリックで反応なし | Service Worker が Inactive なら拡張機能を再読み込み |
| スタイルが崩れる | `dist/assets/*.css` が存在するか確認 |

### テスト実行

```bash
npm run test        # Unit tests (watch mode)
npm run test:run    # Unit tests (単発)
npm run test:e2e    # E2E tests (ブラウザが開く)
npm run typecheck   # 型チェックのみ
```

## 技術スタック

- TypeScript
- Vite + @crxjs/vite-plugin
- Chrome Extension Manifest V3
- Vitest (Unit Tests)
- Playwright (E2E Tests)

## Future Plans

- 翻訳サービスの選択
- 埋め込みデザインの選択
- ショートカットキー対応

## License

MIT License - see [LICENSE](LICENSE) for details.
