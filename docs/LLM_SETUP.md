# Local LLM Setup (Ollama)

The app works fully without an LLM — scoring, trends, and a deterministic vision/mission writer all run on-device. The LLM is an **optional enhancement** that adds richer statement wording and free-text analysis of the Future Perfect letters. When enabled, it runs **entirely on your own machine** via Ollama; your letters and answers never leave your computer.

> **The easy way (no Terminal):** inside CANA, click **"Set up the local AI"**
> (welcome screen or Settings). The built-in wizard checks whether Ollama is
> installed, links you to the download if not, and then downloads the model
> for you with a progress bar. Everything below is the manual equivalent.
>
> **iOS:** the iPhone app never uses Ollama. On supported devices it uses
> Apple's on-device Foundation Model automatically; otherwise the deterministic
> text. There is nothing to set up on iOS.

## 1. Install Ollama
Download from https://ollama.com and install. Verify it's running:
```bash
curl http://localhost:11434
# → "Ollama is running"
```

## 2. Pull a model
These are the three the in-app wizard offers (any Ollama model works):
```bash
ollama pull llama3.1:8b   # Standard — the default; best writing (~4.7 GB)
ollama pull llama3.2:3b   # Small — fastest to download and run (~2 GB)
ollama pull gemma2:2b     # Tiny — quickest, simpler phrasing (~1.6 GB)
```

## 3. (Only if hosting on a website) Allow the page to call Ollama

**If you run the app locally** (`npm run dev` or opening the built files on your own machine), skip this — localhost talking to localhost needs no configuration.

**If you host on GitHub Pages**, the page's origin differs from localhost, so allow it:

By default Ollama only accepts requests from `localhost` *origins*. This app, when hosted on GitHub Pages, runs from a different origin (e.g. `https://you.github.io`), so the browser's cross-origin request will be **rejected** until you tell Ollama to allow it. Set `OLLAMA_ORIGINS`:

**macOS:**
```bash
launchctl setenv OLLAMA_ORIGINS "*"
# then restart the Ollama app
```

**Linux (systemd):**
```bash
systemctl edit ollama
# add under [Service]:
#   Environment="OLLAMA_ORIGINS=*"
systemctl daemon-reload && systemctl restart ollama
```

**Windows:** set a user environment variable `OLLAMA_ORIGINS` = `*`, then restart Ollama.

> `*` allows any origin to reach your *local* Ollama. Since Ollama is only listening on localhost, this exposes it to web pages you visit, not to the internet. If you prefer to be strict, set it to your exact site origin, e.g. `https://yourname.github.io`. Running the app locally (`npm run dev`)? Use `http://localhost:5173`.

## 4. Enable in the app
Open **Settings → Local AI (Ollama)**. The status dot shows whether CANA can
reach Ollama; pick your model from the dropdown and use **Test Connection**.
A green ✓ means you're set. (If you used the in-app wizard, this is already
done.)

## What the LLM does vs. what stays deterministic

| Task | Engine |
| --- | --- |
| All scoring, reverse-coding, gaps, weights, flags, quadrants, trends | **Deterministic (local code)** — never the LLM |
| Letter free-text → themes/dreams/achievements | LLM (if enabled) |
| Top-5 letter commonalities & differences | LLM enriches; **structured dream-ratings are the verifiable backbone** |
| Individual vision & mission | LLM (if enabled), else deterministic writer |
| Joint vision & mission | LLM (if enabled), else deterministic writer |
| Letter alignment score | **Always deterministic** (from your dream ratings) |

If Ollama is unreachable at generation time, the app silently falls back to the deterministic writer and your structured dream-rating comparison. Nothing breaks.

## Privacy note
With the LLM enabled, letters/answers are sent to the configured endpoint — a model on your own machine. Two independent layers guarantee it stays there:

1. **The app refuses non-loopback endpoints.** `src/llm.js` validates every endpoint and will neither save nor use anything that isn't `localhost` / `127.0.0.1` / `[::1]`. There is no supported way to point CANA at a remote AI service.
2. **The Content-Security-Policy** in `index.html` additionally restricts the browser/WebView to `localhost:11434` (plus `api.github.com` for the desktop version check). The iOS build's CSP allows no network origins at all — on iOS the AI is Apple's on-device model, called natively, never over HTTP.
