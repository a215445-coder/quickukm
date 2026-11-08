# QuickUKM — iOS wrapper

QuickUKM runs on iPhone through a small SwiftUI + WKWebView shell. The web app is
bundled as one self-contained HTML file in `QuickUKM/www/index.html`, so the app
works offline and does not need a local server.

## Requirements

- Xcode 16 or newer (built with Xcode 27 on iOS 27)
- Node.js 18+ and `npm` (only needed to regenerate the bundled web app)
- An Apple ID for automatic signing; a free personal team is fine
- The iPhone connected to the Mac and trusted

## Open in Xcode

```bash
open QuickUKM.xcodeproj
```

1. Select the **QuickUKM** target → **Signing & Capabilities**.
2. Choose your own **Team** and, if needed, change the bundle identifier.
3. Select your connected iPhone as the run destination.
4. Press **Run**.

The checked-in project uses the original author's development team. Change the
team/bundle identifier before building under a different Apple ID.

## Install from the command line

```bash
xcrun devicectl list devices          # copy the iPhone UDID
./ios/install.sh <device-udid>
```

The script rebuilds the web bundle, builds the Xcode project, installs the app
on the connected iPhone and launches it.

A free personal Apple Developer signature is valid for **7 days**. Re-run the
script or press Run again to refresh it.

## Update the bundled web app

After changing the React app in the repository root:

```bash
npm install
./ios/sync-web.sh
```

This runs the Vite production build and inlines the JS/CSS into
`QuickUKM/www/index.html`. Rebuild the iOS app afterwards.

## First launch on the iPhone

If iOS says **Untrusted Developer**, open:

**Settings → General → VPN & Device Management → Apple Development → Trust**

Then open QuickUKM again.

## Project layout

```
ios/
  QuickUKM.xcodeproj
  QuickUKM/
    QuickUKMApp.swift      SwiftUI entry point
    WebView.swift          full-screen WKWebView shell
    Info.plist
    Assets.xcassets        app icon + launch colour
    www/index.html         self-contained bundled web app
  inline-dist.py           inlines the Vite build into www/index.html
  sync-web.sh              build web app + refresh www
  install.sh               build + install + launch on a connected iPhone
```
