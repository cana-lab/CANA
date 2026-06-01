# Running & Deploying

This is a desktop web app. It runs in any modern browser on macOS (or Windows/Linux) and talks directly to a local Ollama on the same machine. There are two ways to use it.

## Option A — Run it locally (simplest, fully private, recommended)

No hosting, no GitHub Pages needed. Everything stays on your Mac.

```bash
npm install
npm run dev
```

Open the printed URL (e.g. http://localhost:5173). Because the app and Ollama are both on localhost, **no `OLLAMA_ORIGINS` change is needed** — it just works. To build a static copy you can open without the dev server:

```bash
npm run build
npm run preview      # serves dist/ at a local URL
```

For a permanent local install, set `base: "/"` in `vite.config.js`, run `npm run build`, and open `dist/index.html` through any static server (e.g. `npx serve dist`).

## Option B — Host on GitHub Pages

Useful if you want the app at a URL (still talking to *your own* local Ollama).

### 1. Create the repository
On GitHub: **New repository** → name it `covenant-life-plan` (if you use another name, change `base` in `vite.config.js` to `/<that-name>/`). Public is fine — the repo contains no secrets and no personal data.

### 2. Push the code
```bash
git init
git add .
git commit -m "Initial commit: Covenant Life Plan"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/covenant-life-plan.git
git push -u origin main
```

### 3. Confirm base path
`vite.config.js` → `base` must equal `/covenant-life-plan/` (matches the repo name). For a user site (`USER.github.io`), use `/`.

### 4. Enable Pages
Repo **Settings → Pages → Build and deployment → Source → GitHub Actions**. The included workflow builds and deploys on every push to `main`.

### 5. Allow your local Ollama to answer the hosted page
Because the page is served from `https://you.github.io` but Ollama runs on `localhost`, the browser's cross-origin request is blocked until you tell Ollama to allow it:

- **macOS:** `launchctl setenv OLLAMA_ORIGINS "*"` then restart Ollama.
- **Linux:** `systemctl edit ollama` → add `Environment="OLLAMA_ORIGINS=*"` → `systemctl restart ollama`.
- **Windows:** set user env var `OLLAMA_ORIGINS=*`, restart Ollama.

(See docs/LLM_SETUP.md for the strict, single-origin version.)

### Updating
```bash
git add . && git commit -m "..." && git push
```
The workflow redeploys automatically.

## Troubleshooting
- **Blank page / 404 assets on Pages:** `base` doesn't match the repo name. Fix step 3.
- **Ollama badge red on the hosted page:** `OLLAMA_ORIGINS` not set (step 5) or Ollama isn't running.
- **Running locally and badge is red:** Ollama isn't running, or no model is pulled (`ollama pull llama3.1:8b`).
