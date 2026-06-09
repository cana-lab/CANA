# CANA on iOS — Build Guide (Capacitor + Apple Foundation Model)

This turns the existing, tested CANA web app into a native iOS app. The same
React code runs inside a native shell; a small native Swift plugin lets it use
Apple's on-device Foundation Model (iOS 26+) as an optional enhancement, falling
back to the deterministic text everywhere else — exactly like Ollama on desktop.

**You run all of this on your Mac.** It cannot be done in the sandbox: it needs
macOS, Xcode, CocoaPods, and a real device or simulator. Steps are ordered;
don't skip.

---

## 0. Prerequisites (one time)

- A Mac with **Xcode 16+** installed (from the App Store). Open it once and let
  it install components.
- **Node.js 18+** (you already have this for the web build).
- **CocoaPods**: in Terminal, `sudo gem install cocoapods` (or `brew install cocoapods`).
- Your **Apple Developer account** (the €99 one) signed into Xcode:
  Xcode → Settings → Accounts → add your Apple ID.
- To actually *use* the Apple Foundation Model you need a device with **iOS 26+
  and Apple Intelligence enabled** (iPhone 15 Pro or newer). The app still builds
  and runs on older devices/simulators — it just uses the deterministic text there.

---

## 1. Install dependencies

From the project root (where `package.json` is):

```bash
npm install
```

This now pulls in `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli`
(added to package.json).

## Packaging model — one codebase, two separate packages

Mac and iOS share the SAME source (`src/`) and the SAME app identity
(`com.cana.covenantlife`, same version from `package.json`), but they build and
ship as **separate, independent packages** that never share build output:

| | Mac (Electron) | iOS (Capacitor) |
|---|---|---|
| Build command | `npm run pack:mac` | `npm run ios:sync` then build in Xcode |
| Web build output | `dist/` | `dist-ios/` |
| Package output | `.dmg` in `release/` | `.ipa` / App Store build from Xcode |
| Release channel | GitHub Releases | App Store Connect |

Because the output folders differ (`dist/` vs `dist-ios/`), you can build either
one without disturbing the other. The shared `src/` means a fix to the engine or
a new question lands in both with no duplication.

---

## 2. Create the native iOS project (one time)

```bash
npm run build:ios          # builds the web app with the correct relative paths
npx cap add ios            # scaffolds the native iOS project into ./ios
```

This creates an `ios/` folder containing an Xcode project. It's generated, so
you normally don't edit it by hand — except for the one step below (adding the
plugin), which is a one-time copy.

---

## 3. Add the Apple Foundation Model plugin (one time)

The two files in this `ios-plugin/` folder are the native bridge. Copy them into
the Xcode project:

1. Open the workspace in Xcode:
   ```bash
   npm run ios:open
   ```
   (This opens `ios/App/App.xcworkspace`.)

2. In Xcode's left sidebar, find the **App** group (path `ios/App/App/`).

3. Drag **both** of these files from `ios-plugin/` into that **App** group:
   - `FoundationAIPlugin.swift`
   - `FoundationAIPlugin.m`

   When prompted: tick **"Copy items if needed"** and make sure **target "App"**
   is checked.

4. If Xcode asks to **create an Objective-C bridging header**, click **Yes /
   Create**. (Capacitor projects usually already have one. The `.m` file needs
   the project to allow Objective-C — the bridging header is what enables that.)

That's it — Capacitor auto-discovers the plugin via the `CAP_PLUGIN` macro in the
`.m` file. No JS registration is needed; `src/foundationModel.js` already looks it
up by the name `"FoundationAI"`.

---

## 4. Set the deployment target & capabilities

In Xcode, select the **App** target → **General**:

- **Minimum Deployments**: set to **iOS 16** (the app runs here; the Foundation
  Model code is guarded with `if #available(iOS 26)` so it simply stays inactive
  on older systems). You may set 26 if you only want to support new devices, but
  16 reaches far more users and still degrades gracefully.

The Foundation Model needs **no special entitlement** — it's part of the system.
If a future Xcode flags it, add the capability it names; as of now nothing extra
is required.

---

## 5. Signing

Still in the **App** target → **Signing & Capabilities**:

- Check **Automatically manage signing**.
- Choose your **Team** (your Apple Developer account).
- Xcode generates the provisioning profile. The bundle id is
  `com.cana.covenantlife` (from `capacitor.config.json`) — change it here if you
  want a different one, and keep it consistent.

---

## 6. Run it

- Pick a target device at the top of Xcode (a simulator, or your plugged-in
  iPhone), then press **▶ Run**.
- On a real iPhone 15 Pro+ with iOS 26 and Apple Intelligence on, the AI
  enhancement runs on-device. On anything else, you'll see the full deterministic
  report — which is complete on its own.

---

## 7. The normal update loop (after the one-time setup)

Whenever you change the React app:

```bash
npm run ios:sync     # = build:ios + cap sync ios  (copies the new web build in)
```

Then just press Run in Xcode again. You only repeat steps 2–5 once; after that
`ios:sync` is the whole loop. The plugin files stay in the project.

---

## 8. App Store submission (when ready)

- In Xcode: **Product → Archive**, then **Distribute App → App Store Connect**.
- You'll need an app record in App Store Connect (appstoreconnect.apple.com),
  an app icon set, screenshots, and a privacy nutrition label.
- **Privacy label**: CANA collects nothing and transmits nothing — declare "Data
  Not Collected". The Foundation Model runs on-device; say so in the review notes.
- Religious + intimacy content is allowed but can draw extra review scrutiny;
  a clear description and the "conversation tool, not clinical" framing help.

---

## What I could and couldn't verify

- **Verified in the sandbox**: the web build for the iOS target compiles; the JS
  bridge (`src/foundationModel.js`) behaves correctly across web / non-iOS / iOS /
  failure cases (8/8 unit checks); the desktop and web builds are unaffected; the
  AI still builds on the deterministic foundation.
- **NOT verifiable in the sandbox, you must confirm on your Mac**: that the Swift
  plugin compiles in Xcode, that the `CAP_PLUGIN` registration is picked up, that
  the FoundationModels API names (`SystemLanguageModel`, `LanguageModelSession`,
  `respond(to:)`) match the SDK version you have, and that generation actually
  works on a real device. Apple's API names can shift between betas — if Xcode
  reports an unknown symbol in `FoundationAIPlugin.swift`, that's where to look,
  and it's a small fix, not a redesign.
