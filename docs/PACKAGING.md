# Packaging CANA into a .dmg installer

This guide explains how to build the macOS installer (`CANA.dmg`) with the
standard visual "drag to Applications" window, and how CANA's first-launch
setup wizard handles the AI dependencies.

---

## 1. Build the installer

On your Mac, double-click **`Build signed Mac app.command`** — it builds,
signs, notarizes, and staples in one step (Apple credentials are stored in
your Keychain on first run; see `SIGNING_AND_NOTARIZING.md`). For a quick
*unsigned* dev pack, run `npm run pack:mac` instead — that .dmg will not open
cleanly on other Macs. Either way the output lands in `release/`:

- `CANA-<version>-arm64.dmg` — Apple Silicon
- `CANA-<version>.dmg` — Intel
- `latest-mac.yml` — read by the in-app auto-updater; upload it to the GitHub
  Release together with both .dmgs

Each `.dmg`, when opened, shows the standard installer window: the **CANA icon
on the left** and an **Applications shortcut on the right**, so the user drags
one onto the other. This layout is defined in `package.json` under
`build.dmg` (window size, icon size, and the two positioned items — the app
file and the `/Applications` symlink). No extra tooling is needed;
`electron-builder` draws the window.

To customize the look further, you can add a `build/background.png`
(540×380 to match the window) and reference it with `"background":
"build/background.png"` in the `dmg` block — for example, a faint arrow from
the icon to the Applications folder.

---

## 2. What the user does

1. Open the `.dmg`, drag **CANA** onto **Applications**.
2. Launch CANA from Launchpad/Applications.
3. **First launch only:** because the app is unsigned, macOS shows
   "Apple cannot check it…". The user opens **System Settings → Privacy &
   Security → Open Anyway** once. (Removing this permanently requires a paid
   Apple Developer signing certificate.)

---

## 3. The first-launch setup wizard (AI dependencies)

CANA includes an in-app **Setup** screen (reachable from the welcome screen via
"Set up the local AI", and intended for first launch). It is honest about what
macOS does and does not allow an app to do:

**What it cannot do (and why):** macOS deliberately forbids an app from
silently installing other software or system services. Installing Ollama
requires the user's explicit consent and admin rights; an app that could do
that invisibly would be indistinguishable from malware, and Gatekeeper/TCC/SIP
exist to stop it. So the wizard **guides** the two real installs rather than
performing them silently.

**What it does:**

- **Detects** whether Ollama is installed and running, and which models are
  present (via the local Ollama API and an on-disk binary check exposed by a
  minimal, safe Electron bridge — read-only; it cannot install anything).
- **Guides Ollama setup** with a one-click "Download Ollama for Mac" button
  (opens the official page in the browser) and a live "Re-check" that flips to
  a green "Running" state once the user has installed and opened it.
- **Automates the model download** — the one part CANA *can* safely drive.
  The user picks a size (Tiny ~1.6 GB / Small ~2 GB / Standard ~4.7 GB), and
  CANA pulls it through Ollama's API with a live progress bar, then points its
  own config at the new model. The user stays in the CANA window throughout.
- **Lets the user skip entirely** — CANA works fully without any AI, using its
  built-in deterministic text for the vision and mission. The AI only improves
  the *wording* of those two statements; it never touches the scores.

So the experience is: guided where macOS requires consent, automated where it
safely can be, and never blocking — the app is fully usable with no AI at all.

---

## 4. Privacy

Nothing in the setup flow sends data off the machine. The model is pulled by
the user's own local Ollama; the only outbound action CANA itself takes is
opening the official Ollama download page in the browser when asked. The app's
content-security policy still restricts connections to `localhost` only.
