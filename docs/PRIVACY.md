# Privacy: The Data-Never-Leaves Guarantee

The answers a couple gives this tool are deeply personal. This document explains exactly how the architecture makes it **impossible** for that data to leave the device — not as a policy promise, but as a structural property you can verify yourself.


> **Update (v2.2 — local LLM):** To support optional local-LLM enhancement, the CSP now permits connections to `localhost:11434` / `127.0.0.1:11434` **only** — i.e. a model running on your own machine. All other outbound connections remain blocked. If the LLM is disabled, no network calls are made at all. If you reconfigure the app to use a non-localhost endpoint, you must explicitly add that origin to the CSP — data cannot silently flow to a new destination. See docs/LLM_SETUP.md.

## The short version

- There is **no server**. The app is static files. There is nowhere for your data to be sent.
- There are **no network calls** in the application code. All scoring and synthesis runs in your browser's JavaScript.
- A **Content-Security-Policy that restricts `connect-src` to localhost only** instructs the browser to block *every* outbound request (fetch, XHR, WebSocket, beacon). Even if a future bug or dependency tried to phone home, the browser refuses.
- Your in-progress answers are stored only in **`localStorage`**, which is local to your device and your browser, and is never transmitted.
- There is **no analytics, no telemetry, no third-party fonts or CDNs, no trackers**.

## How each layer works

### Layer 1 — No backend
The entire app compiles to static HTML/CSS/JS. GitHub Pages (or any static host) serves those files and does nothing else. There is no database, no API endpoint, no log of answers. The synthesis that earlier versions sent to an AI service is now done by a **local deterministic engine** (`src/engine.js`) that runs on your device.

### Layer 2 — No network calls in the bundle
The production JavaScript bundle contains **zero** `fetch`, `XMLHttpRequest`, `WebSocket`, or `navigator.sendBeacon` calls. You can verify this:

```bash
npm run build
grep -c "fetch(" dist/assets/index-*.js     # → 0
grep -c "anthropic" dist/assets/*.js          # → 0
```

(The Workbox **service worker** contains a `fetch` *event handler*, but that only intercepts same-origin requests for *your own* app files to enable offline use. It never originates a request to any third party, and Layer 3 would block it if it tried.)

### Layer 3 — Content-Security-Policy `connect-src 'none'`
`index.html` ships this policy in a `<meta http-equiv="Content-Security-Policy">` tag:

```
default-src 'self';
connect-src 'none';        ← blocks ALL outbound data connections
img-src 'self' data:;
style-src 'self' 'unsafe-inline';
script-src 'self';
base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none';
```

`connect-src 'none'` is the keystone. It tells the browser to deny every script-initiated network connection. This is enforced by the browser itself, independent of the app code. It is the backstop that makes the guarantee hold even against bugs or supply-chain tampering in a dependency.

> **Note on hardening:** a `<meta>` CSP is honored by all modern browsers. For defense in depth on a host that supports custom response headers, also send the CSP as an HTTP header. GitHub Pages does not allow custom headers, so the `<meta>` tag is the correct mechanism there. If you self-host behind a server or CDN (e.g. Netlify, Cloudflare Pages), add the header version too — see `DEPLOYMENT.md`.

### Layer 4 — Local-only persistence
Your progress is saved to `localStorage` under a single key so you can close and resume. `localStorage`:
- is scoped to your origin and your browser profile,
- is readable only by this app on this device,
- is **never** transmitted anywhere.

The app provides a **"Start Over"** button that erases this key. You can also clear it via your browser's site-data settings.

### Layer 5 — No third parties
- No Google Fonts or external font CDNs (the app uses the system serif stack).
- No analytics or tag managers.
- No external images — textures are inline SVG/data-URIs.
- `robots.txt` disallows indexing, and the page is marked `noindex, nofollow`.

## What an attacker (or a curious spouse on another device) cannot do

- They cannot fetch your answers from a server — there isn't one.
- They cannot intercept your answers in transit — nothing is ever sent.
- They cannot read your `localStorage` from another device or browser.

## What is still your responsibility

Privacy by architecture protects the *data path*. It cannot protect against:
- **Shared devices.** If two people use the same browser profile, both can see the saved progress. Use separate devices or browser profiles for truly independent answering, or use "Start Over" / a private window.
- **Printed output.** The Print/Save-PDF feature creates a file on your device; protect that file as you would any sensitive document.
- **Screen visibility.** Standard shoulder-surfing common sense applies.

## Verifying it yourself

1. Open the app, then open your browser's **DevTools → Network** tab.
2. Complete an assessment and generate a plan.
3. Observe: **no outbound requests** are made during scoring or synthesis (only the initial same-origin load of the app's own files).
4. In **DevTools → Application → Local Storage**, you can see your data is stored locally and nowhere else.
