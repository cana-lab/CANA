# Versions & Updates — GitHub setup guide

CANA shows its version on the home screen and has a **Check for updates** button.
This guide gets that working end to end. It assumes nothing — follow it in order.

---

## How updates work (in one paragraph each)

**Packaged Mac app (current mechanism).** The app uses `electron-updater`:
shortly after launch (and on "Check for updates") it reads `latest-mac.yml`
from this repo's newest GitHub Release. If a newer version exists, the user
sees a banner; the download starts only after they consent, and before
installing, **Squirrel.Mac verifies that the new build is signed with the
same Developer ID as the running app**. The user can install immediately
("Restart & install") or defer to next quit. This is why every release must
include `latest-mac.yml` *and* both `.dmg` files.

**Web build (GitHub Pages demo).** No installer exists, so the web build only
fetches `https://api.github.com/repos/<owner>/<repo>/releases/latest`,
compares version numbers, and shows a download link.

**iOS.** Updates ship through TestFlight / the App Store; the in-app update
UI is hidden entirely on iOS.

---

## Part A — Create the GitHub repository (one time)

1. Make a free account at github.com if you don't have one.
2. Click **+ → New repository**. Name it (e.g. `cana`). Public or private both
   work — but note: with a **private** repo the update check needs a token,
   which is more setup. **Public is much simpler; recommended** unless you have
   a reason to hide the code.
3. Don't initialize with anything; just create the empty repo.
4. On your Mac, in the CANA project folder, run these in Terminal (replace
   `YOUR-NAME`):

   ```bash
   cd /Users/dasachs/Desktop/CANA      # your CANA folder
   git init
   git add .
   git commit -m "CANA initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/cana.git
   git push -u origin main
   ```

   GitHub will ask you to authenticate; follow its browser prompt or use a
   Personal Access Token if asked for a password.

---

## Part B — Point CANA at your repo (one line)

Open `src/update.js` and edit the one marked line:

```js
export const GITHUB_REPO = "YOUR-NAME/cana";   // was "REPLACE_WITH/your-repo"
```

Until you do this, the button simply says "Update checking isn't set up yet" —
it never errors. After you set it, rebuild the app (`Build CANA app.command`)
so the change is included.

---

## Part C — Publish a release whenever you update CANA

Each time you want to ship a new version:

1. **Bump the version** in `package.json` (e.g. `"version": "4.4.0"`). This is
   the number the app shows and compares against — keep it accurate.
2. **Build** the app (`Build CANA app.command`) → you get the `.dmg` files in
   `release/`.
3. On GitHub, go to your repo → **Releases → Draft a new release**.
4. **Tag**: type `v4.4.0` (the leading `v` is fine — CANA handles it). Match the
   package.json version.
5. **Title**: e.g. "CANA 4.4.0". Paste a short summary of changes (your
   CHANGELOG entry is perfect).
6. **Attach the `.dmg` files**: drag the two files from `release/` into the
   release's attachments box, so users can download them.
7. Click **Publish release**.

That's it. The next time anyone clicks **Check for updates** in an older copy of
CANA, it sees the new tag, says "CANA 4.4.0 is available," and the Download
button opens this release page.

---

## Versioning convention (keep it clear)

Use simple three-part numbers, `MAJOR.MINOR.PATCH`:

- **PATCH** (4.3.0 → 4.3.1): small fixes, no new features.
- **MINOR** (4.3.0 → 4.4.0): new features, nothing broken for existing users.
- **MAJOR** (4.x → 5.0.0): big or breaking changes.

The version in `package.json`, the git tag (`v…`), and the release title should
always match. The app reads `package.json` automatically at build time, so you
only set the number in one place.

---

## What this is and isn't

- **Is:** clear in-app version, a one-click "is there a newer one?" check, and a
  direct link to the download. Free, no Apple account, no servers of your own.
- **Isn't:** silent auto-update (Chrome-style). That requires Apple Developer
  code-signing + notarization ($99/yr) and `electron-updater`; macOS refuses to
  auto-install unsigned updates. If you ever enroll in the Apple Developer
  Program, this can be upgraded to true auto-update — the release structure here
  is already compatible with that step.
