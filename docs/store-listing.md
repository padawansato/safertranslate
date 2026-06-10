# Chrome Web Store 掲載素材ドラフト

提出時にダッシュボードへ転記する素材。確定したらこのファイルを更新して履歴を残す。

## 基本情報

| 項目 | 値 |
|------|-----|
| 名前 | SaferTranslate |
| カテゴリ | 仕事効率化 (Productivity) |
| 言語 | 日本語 / English |
| ホームページ | <https://github.com/padawansato/safertranslate> |
| プライバシーポリシー URL | <https://github.com/padawansato/safertranslate/blob/main/docs/privacy-policy.md> |

## 概要（Short description, 132 字以内）

**EN** (121 chars):

> Privacy-friendly bilingual translation. Shows original and Japanese side by side. Optional on-device LLM keeps text local.

**JA** (約 60 字):

> プライバシー重視のバイリンガル翻訳。原文の下に日本語訳を並べて表示。ローカル LLM ならテキストは端末の外に出ません。

## 詳細説明（Detailed description）

### English

SaferTranslate adds a Japanese translation right below the original text —
inspired by immersive bilingual reading. Click the icon once to translate the
page, click again to remove the translations.

Why "Safer"? You choose where your text goes:

- **MyMemory API** (default) — free, no API key, text is sent only to the
  translation API
- **On-device LLM** — Transformers.js + MarianMT runs entirely in your
  browser; page text never leaves your device. Works offline after the first
  model download

No analytics, no tracking, no ads, no accounts. Open source (MIT):
https://github.com/padawansato/safertranslate

### 日本語

SaferTranslate は、原文の下に日本語訳を並べて表示するバイリンガル翻訳拡張です。
アイコンをクリックするとページを翻訳し、もう一度クリックすると翻訳を削除します。

「Safer」の理由 — テキストの送信先を自分で選べます:

- **MyMemory API**（デフォルト）— 無料・API キー不要。テキストは翻訳 API にのみ送信
- **ローカル LLM** — Transformers.js + MarianMT がブラウザ内で完結。ページの
  テキストは端末の外に出ません。初回のモデルダウンロード後はオフラインでも動作

アナリティクス・トラッキング・広告・アカウント登録なし。オープンソース（MIT）:
https://github.com/padawansato/safertranslate

## スクリーンショット計画（1280x800, 3-5 枚）

| # | 内容 | 撮影方法 |
|---|------|----------|
| 1 | 英語記事ページのバイリンガル表示（原文+訳文ボックス） | Playwright E2E 流用で自動化可能 |
| 2 | ポップアップ UI（Translate Page ボタン + プロバイダ選択） | 既存の popup visual baseline を流用 |
| 3 | ローカル LLM のフェーズ別進捗 UI（モデル DL → 推論） | 手動 or E2E |
| 4 | トグル動作の before/after 比較（1 枚に合成） | 手動合成 |

## 提出前チェックリスト

- [ ] `manifest.json` の `version` を `1.0.0` に
- [ ] `npm run package:chrome` で zip 生成
- [ ] スクリーンショット 3 枚以上を 1280x800 で用意
- [ ] プライバシーポリシー URL がダッシュボードの「プライバシーへの取り組み」欄に設定済み
- [ ] permissions の使用理由をダッシュボードに記入（docs/privacy-policy.md の表を流用）
