#!/bin/sh
# Build (or refresh) the golden Chrome profile used by `npm run test:prompt-api`.
#
# Reuses the Gemini Nano model that the user's own Google Chrome already downloaded:
# - OptGuideOnDeviceModel/ is APFS-cloned (`cp -c`: no data copied, ~0 extra disk; macOS only);
# - only the model-related `optimization_guide.on_device` and
#   `optimization_guide.model_execution.manifest_asset_ledger` prefs are copied into a new
#   `Local State`. Nothing else is read from the user's profile (no cookies, no os_crypt key).
# Nothing is downloaded. Re-run after Google Chrome updates its model.
set -eu

CHROME_DIR="${CHROME_USER_DATA_DIR:-$HOME/Library/Application Support/Google/Chrome}"
PROFILE="${PROMPT_API_PROFILE:-$HOME/.cache/browser-trading-agents/prompt-api-profile}"

if [ ! -d "$CHROME_DIR/OptGuideOnDeviceModel" ]; then
  echo "No on-device model in $CHROME_DIR. Use the Prompt API once in Google Chrome so it downloads the model, then re-run." >&2
  exit 1
fi

rm -rf "$PROFILE"
mkdir -p "$PROFILE"
cp -c -R "$CHROME_DIR/OptGuideOnDeviceModel" "$PROFILE/"

node -e '
const fs = require("node:fs");
const [src, dest] = process.argv.slice(1);
const og = JSON.parse(fs.readFileSync(src, "utf8")).optimization_guide ?? {};
if (!og.on_device || !og.model_execution?.manifest_asset_ledger) {
  console.error("Model prefs not found in " + src);
  process.exit(1);
}
const subset = { optimization_guide: { on_device: og.on_device,
  model_execution: { manifest_asset_ledger: og.model_execution.manifest_asset_ledger } } };
fs.writeFileSync(dest, JSON.stringify(subset));
' "$CHROME_DIR/Local State" "$PROFILE/Local State"

echo "Golden profile ready: $PROFILE"
ls "$PROFILE/OptGuideOnDeviceModel"
