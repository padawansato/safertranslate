#!/usr/bin/env bash
#
# Safari Web Extension end-to-end rebuild + reload.
#
# What this script does:
#   1. Builds the Safari bundle (dist-safari/)
#   2. Regenerates the Xcode project
#   3. Builds the container .app
#   4. Opens the .app so Safari registers the extension
#   5. Forces Safari to reload the extension via `pluginkit ignore/use`
#   6. Prints the manual steps needed for the actual DOM-level check
#
# What it does NOT do:
#   - Grant the SaferTranslate extension permission on localhost
#     (Safari requires a user click on "Always Allow on Every Website"
#     or equivalent. Do this once manually; it persists across runs.)
#   - Start the fixtures dev server (`npx serve tests/fixtures -p 3333`)
#     since users typically already have one running. Start it yourself
#     in another terminal if needed.
#   - Run the DOM assertion. Use the Web Inspector or safari-mcp to
#     query `document.querySelectorAll('.safertranslate-box').length`
#     on the auto-translated page. See rules/safari-messaging.md.
#
# See also: tests/unit/content/e2e-hooks.test.ts — the content-script hook
# (URL flag `?safertranslate_test=1` and window.postMessage) that lets this
# workflow trigger a translation without clicking the popup button.

set -euo pipefail

readonly BUNDLE_ID="com.padawansato.SaferTranslate.Extension"
readonly APP_GLOB="$HOME/Library/Developer/Xcode/DerivedData/SaferTranslate-*/Build/Products/Debug/SaferTranslate.app"
readonly FIXTURE_URL="http://localhost:3333/sample-page.html?safertranslate_test=1"

log() {
  printf '==> %s\n' "$*"
}

log "1/5 Build Safari bundle (dist-safari/)"
npm run build:safari

log "2/5 Regenerate Xcode project"
rm -rf safari-extension
npm run safari:convert

log "3/5 Build .app"
npm run safari:build

log "4/5 Register extension (open container app)"
APP_PATH=""
for candidate in $APP_GLOB; do
  if [[ -d "$candidate" ]]; then
    APP_PATH="$candidate"
    break
  fi
done
if [[ -z "$APP_PATH" ]]; then
  printf 'error: built .app not found under %s\n' "$APP_GLOB" >&2
  exit 1
fi
open "$APP_PATH"
sleep 2

log "5/5 Force extension reload via pluginkit"
pluginkit -e ignore -i "$BUNDLE_ID"
sleep 1
pluginkit -e use -i "$BUNDLE_ID"
sleep 1

cat <<EOF

===================================
  Safari extension (re)built.
===================================

First-time setup (once per machine, persists):
  1. Safari → 設定 → 機能拡張 → SaferTranslate を ON
  2. SaferTranslate を選択 → 「次の web サイトを開くたびに確認」で
     localhost を「許可」または「すべての web サイトで許可」
  3. (optional) Safari → 開発 → 「Apple Events からの JavaScript を許可」を ON
     → safari-mcp や osascript で DOM を自動検査できる

Running the E2E check:
  1. Ensure: \`npx serve tests/fixtures -p 3333 -L\` is running
  2. Open in Safari:
       ${FIXTURE_URL}
     The URL flag \`?safertranslate_test=1\` hits the content-script E2E
     hook and auto-translates the page (~2s).
  3. In Web Inspector → Console:
       document.querySelectorAll('.safertranslate-box').length
     → expected: > 0 (sample-page has ~10 visible translatable elements).

See rules/safari-messaging.md for the full playbook.
EOF
