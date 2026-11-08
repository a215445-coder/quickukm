#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEVICE_ID="${1:-}"
BUNDLE_ID="app.golftrace.quickukm"

if [ -z "$DEVICE_ID" ]; then
  echo "Usage: ./ios/install.sh <device-udid>"
  echo
  echo "Find the connected iPhone UDID with:"
  echo "  xcrun devicectl list devices"
  exit 1
fi

"$ROOT/sync-web.sh"

cd "$ROOT"
xcodebuild \
  -project QuickUKM.xcodeproj \
  -scheme QuickUKM \
  -configuration Debug \
  -destination "platform=iOS,id=$DEVICE_ID" \
  -derivedDataPath "$ROOT/build" \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  build

xcrun devicectl device install app --device "$DEVICE_ID" \
  "$ROOT/build/Build/Products/Debug-iphoneos/QuickUKM.app"

xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID"
