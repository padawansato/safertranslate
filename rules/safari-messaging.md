# Safari runtime.onMessage と content script 二重注入対策

## ルール

1. `runtime.onMessage.addListener` の listener は**常に `return true`** を返す
2. Content script は**モジュール top-level の window-level guard** で listener 登録を 1 回に制限する

## 根拠

### MDN 仕様

[MDN runtime.onMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage) より:

> "return `true` from the event listener. This keeps the `sendResponse()` function valid after the listener returns, so you can call it later."

- `return true` — 非同期応答の宣言。`sendResponse` が listener return 後も有効
- `return false` / `undefined` / 省略 — listener return 直後に `sendResponse` が無効化される
- Promise を返すのは Firefox で推奨されるが、Chrome は historical な制約があるため `return true` + `sendResponse` パターンが最も移植性が高い

### Safari 17 の実測挙動

MDN 仕様上は **sync** `sendResponse` + `return false` は listener return 前に応答が完了するので動くはずだが、Safari 17 で以下が確認された ([#8](https://github.com/padawansato/safertranslate/issues/8)):

- content script で `sendResponse(ack); return false` とすると、popup 側の `tabs.sendMessage` の応答が `undefined` になる
- Chrome では同じコードが正常に動作
- `return true` に変えると Safari でも正常動作する

このため、**sync/async にかかわらず `return true` を default に**。コストはほぼゼロ (channel を open にしておくだけ)。

### 二重注入による重複実行

`contentScriptInjector.ts` は 2 段階フォールバック:

```
Step 1: tabs.sendMessage(tabId, msg)
   ↓ undefined or 例外
Step 2: scripting.executeScript({files: ['content.js']})  ← 二重注入発生点
Step 5: tabs.sendMessage(tabId, msg) リトライ
```

Safari で Step 1 が undefined を返すと Step 2 で content script が isolated world に再注入される。結果:

- 2 つの `runtime.onMessage` listener が登録される
- `TRANSLATE_PAGE` メッセージ受信時、両 listener が発火
- `runTranslation` が並列に 2 回走り、各要素に 2 つの翻訳ボックスが injection される

**`return true` の修正だけで通常パスでは再注入が起きなくなるが、window-level guard は防御線**として残す。将来 manifest 変更や他の要因で再注入が起きても、listener 登録は 1 回に保たれる。

## 実装パターン

### Listener 登録 (content script)

```ts
const WINDOW_GUARD = '__safertranslate_listener_v1' as const;
type GuardedWindow = Window & { [WINDOW_GUARD]?: boolean };
const guardedWindow = window as GuardedWindow;

if (!guardedWindow[WINDOW_GUARD]) {
  guardedWindow[WINDOW_GUARD] = true;

  runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (message.type !== 'TARGET_TYPE') return false;  // 他メッセージは pass-through
      try {
        sendResponse({ type: 'ACK', ... });
        void doAsyncWork();  // errors reported via runtime.sendMessage
      } catch (err) {
        sendResponse({ type: 'START_FAILED', error: String(err) });
      }
      return true;  // ← Safari 対策の必須
    },
  );
}
```

### Guard key の命名

- 拡張機能スコープで一意にする (他の拡張と衝突しないよう)
- バージョン suffix (`_v1`) を付け、将来 listener の契約が変わったときに旧インスタンスと分離できるようにする

### 非対象メッセージの扱い

listener が拾わないメッセージ (`message.type !== 'TARGET_TYPE'`) では `return false` のままでよい。MDN 仕様上、他の listener が処理するチャンスを与えるため、unhandled メッセージに `return true` は付けない。

## 関連箇所

- `src/content/index.ts` — guard + listener の実装
- `src/lib/contentScriptInjector.ts` — 2 段階 fallback ロジック (二重注入の起点)
- `src/background/index.ts` — 非同期 sendResponse パターン (`return true` + `.then(sendResponse)`)
- `src/offscreen/offscreen.ts` — 同上

## チェックリスト (新しい listener を追加するとき)

- [ ] `return true` を listener の最後に入れているか
- [ ] `return false` は非対象メッセージ (early return) だけか
- [ ] content script の場合、top-level guard で囲まれているか
- [ ] Guard key が拡張固有で、バージョン suffix が付いているか

## ESLint による自動チェック

`safer-translate/no-onmessage-return-false` (eslint-rules/no-onmessage-return-false.js) が `runtime.onMessage.addListener` 配下で sendResponse を呼んだ後の `return false`/`return undefined`/暗黙 undefined を機械的に検出する。`if (msg.type !== 'X') return false` のような早期 guard や、sendResponse を呼ばないパスの catch-all `return false` は false positive にならないよう制御フロー解析で除外している。`npm run lint` で常に検査される。

## Safari E2E 自動化 (`npm run test:safari`)

`scripts/safari-e2e.sh` が build → Xcode 再変換 → .app ビルド → container app 起動 → pluginkit によるリロードまでを一気通貫で実行する。CI (Linux) では走らず、macOS ローカル専用。

### 初回セットアップ (一度だけ)

1. Safari → 設定 → 機能拡張 → SaferTranslate を ON
2. 同パネル → 「次の web サイトを開くたびに確認」で `localhost` を「許可」（永続化）
3. (optional) Safari → 開発 → 「Apple Events からの JavaScript を許可」を ON（safari-mcp や osascript から DOM 検査したいとき）

### 実行フロー

```bash
npx serve tests/fixtures -p 3333 -L  # 別ターミナルで常駐
npm run test:safari
# Safari で http://localhost:3333/sample-page.html?safertranslate_test=1 を開く
```

`?safertranslate_test=1` クエリは content script 側の E2E hook (`src/content/e2e-hooks.ts`) を起動し、popup ボタンを押さずに翻訳を自動トリガーする。`window.postMessage({type: 'SAFERTRANSLATE_TEST_TRIGGER'}, '*')` でも同じ結果が得られる（safari-mcp から呼ぶとき用）。

検査: Web Inspector の Console で `document.querySelectorAll('.safertranslate-box').length` を見る。sample-page の期待値は > 0。

### スコープ外

- **permission の完全自動化**: AppleScript / plist 直編集は試行錯誤コストが大きく、必要なら別 issue 化する
- **GitHub Actions で Safari を走らせる**: `macos-latest` runner で技術的には可能だが時間・コスト制約から見送り
