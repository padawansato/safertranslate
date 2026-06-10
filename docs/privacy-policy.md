# SaferTranslate Privacy Policy / プライバシーポリシー

Last updated: 2026-06-10

## English

### Overview

SaferTranslate is a browser extension that shows a Japanese translation below
the original text on web pages. It is built to be privacy-friendly: the
developer does **not** collect, store, or transmit any personal information,
browsing history, usage analytics, or telemetry. There are no ads, no
trackers, and no sale of data.

### Data the extension handles

#### Text you translate

- **MyMemory provider (default)**: When you trigger a translation, the text of
  the current page is sent over HTTPS to the MyMemory translation API
  (`api.mymemory.translated.net`), operated by Translated S.r.l., solely to
  obtain a translation. That data is handled under MyMemory's own terms and
  privacy policy (see <https://mymemory.translated.net>). The extension sends
  nothing else — no cookies, identifiers, or page URLs.
- **Local LLM provider**: Translation runs entirely on your device using
  Transformers.js. Page text never leaves your browser. On first use, the
  model files (`Xenova/opus-mt-en-jap`) are downloaded from the Hugging Face
  CDN (`huggingface.co`); this download contains no page content or personal
  data, and the files are cached locally afterwards.

#### Settings

Your provider selection is saved with `chrome.storage.local` on your device
only. It is never synced or transmitted.

### Permissions explained

| Permission | Why it is needed |
|------------|------------------|
| `activeTab` | Interact with the tab you clicked the extension icon on |
| `scripting` | Inject the translation script/styles as a fallback |
| `storage` | Save your provider setting on-device |
| `offscreen` (Chrome) | Run the local LLM in an offscreen document |
| Content script on all sites | Render translations below the original text. It does not read or send any page content until you explicitly trigger a translation |

### Changes & contact

Changes to this policy are published in this repository. Questions or
concerns: open an issue at
<https://github.com/padawansato/safertranslate/issues>.

## 日本語

### 概要

SaferTranslate は、Web ページの原文の下に日本語訳を表示するブラウザ拡張機能です。
プライバシー重視で設計されており、開発者が個人情報・閲覧履歴・利用統計・テレメトリを
収集・保存・送信することは**一切ありません**。広告・トラッカー・データ販売もありません。

### 拡張機能が扱うデータ

#### 翻訳するテキスト

- **MyMemory プロバイダ（デフォルト）**: 翻訳を実行すると、ページのテキストが
  翻訳取得のためだけに HTTPS で MyMemory 翻訳 API（`api.mymemory.translated.net`、
  Translated S.r.l. 運営）に送信されます。送信データの取り扱いは MyMemory の
  規約・プライバシーポリシー（<https://mymemory.translated.net>）に従います。
  Cookie・識別子・ページ URL などテキスト以外は送信しません。
- **ローカル LLM プロバイダ**: Transformers.js により翻訳は完全に端末内で実行され、
  ページのテキストがブラウザの外に出ることはありません。初回利用時のみモデルファイル
  （`Xenova/opus-mt-en-jap`）を Hugging Face CDN（`huggingface.co`）からダウンロード
  しますが、この通信にページ内容や個人情報は含まれず、以降はローカルにキャッシュされます。

#### 設定

プロバイダ選択の設定は `chrome.storage.local` で端末内にのみ保存され、
同期・送信されません。

### 権限の説明

| 権限 | 必要な理由 |
|------|-----------|
| `activeTab` | アイコンをクリックしたタブの操作 |
| `scripting` | 翻訳スクリプト/スタイルのフォールバック注入 |
| `storage` | プロバイダ設定の端末内保存 |
| `offscreen`（Chrome） | ローカル LLM を offscreen document で実行 |
| 全サイトへの content script | 原文の下に翻訳を表示するために必要。翻訳を明示的に実行するまでページ内容の読み取り・送信は行いません |

### 変更・連絡先

本ポリシーの変更は本リポジトリで公開します。質問・懸念は
<https://github.com/padawansato/safertranslate/issues> へ。
