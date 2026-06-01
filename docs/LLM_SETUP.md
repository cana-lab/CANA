# Local LLM Setup (Ollama)

The app works fully without an LLM — scoring, trends, and a deterministic vision/mission writer all run on-device. The LLM is an **optional enhancement** that adds richer statement wording and free-text analysis of the Future Perfect letters. When enabled, it runs **entirely on your own machine** via Ollama; your letters and answers never leave your computer.

## 1. Install Ollama
Download from https://ollama.com and install. Verify it's running:
```bash
curl http://localhost:11434
# → "Ollama is running"
```

## 2. Pull a model
An 8B model is a good balance of quality and speed on most machines:
```bash
ollama pull llama3.1:8b
```
Lighter option for modest hardware: `ollama pull qwen2.5:3b`. Higher quality if you have the RAM/GPU: `ollama pull qwen2.5:14b`.

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
Open **⚙ LLM Settings**, toggle **ON**, confirm the endpoint (`http://localhost:11434/v1`) and model (`llama3.1:8b`), then **Test Connection**. A green ✓ means you're set.

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
With the LLM enabled, letters/answers are sent to the endpoint you configured. With the default localhost endpoint, that is a model on your own machine and the data does not leave it. The Content-Security-Policy in `index.html` permits connections **only** to `localhost:11434` (and `127.0.0.1`). If you point the app at any other endpoint, you must add that origin to the CSP yourself — an intentional friction so data can't silently go somewhere new.
